// ZoneMinder (A)ctive (R)response (C)amera console view JS file, $Date:
// 2013-08-30 19:52:12 +0000 (Fri, 30 Aug 2013) $, $Revision: 1 $
// Copyright (C) 2013 Anthony Cassandra
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
//

//========================================
// Terminology
//========================================
//
//   o Monitor - ZoneMinder's definition roughly corresponding to a camera.
//
//   o Alarm - ZoneMinder's definition of motion activity happening on 
//             a monitor. An alarm does *not* necessarily correspond to 
//             an important event. See below.
//
//   o Alert - ZoneMinder's definition of a monitor that was recently in
//             the alarm state. ZoneMinder uses this level to know how to
//             group intervals of alarms.  A new alarm while in the alert
//             state will get joined with the previous alarm to and become
//             part of the same event.
//
//   o Alarm Frames - ZoneMinder's term for the number of video frames a
//                    monitor was in the alarm state.  Each event will
//                    has an associated number of alarm frames that can
//                    be used to judge the severity of the event.
//
//   o Event - ZoneMinder's term for capturing an alarm over a duration of
//             time.
//
//   o Notified Event - ARC Console's term for an event that resulted in the
//                      user being emailed or messaged (which result from
//                      ZoneMinder's "filters").
//
//   o Signal - ARC Console's term for visually or audibly notifying the 
//              user via the console HTML web page.
//
//   o Warning Signal - ARC Console's term for a signal that "lightly"
//                      indicates something of interest is happening.  A
//                      monitor alarm or alert results in a warning signal.
//
//   o Critical Signal - ARC Console's term for a signal that "aggressively"
//                       indicates something of interest is happening. A
//                       new "notified event" or an event with a significant
//                       number of "alarm frames"


//========================================
// Theory of Operation
//========================================

// The (A)ctive (R)response (C)amera console is a custom view (really set
// of views) for ZoneMinder that fits a particular usage pattern I (Anthony
// Cassandra) needed.  It gives you basic control of seeing live feeds and
// events, but is tailored toward the most recent events, and more
// importantly, it automatically will play new events and switch live feeds
// to the monitor (a.k.a., camera) where the latest event occurred.  This
// is more useful for me for general live monitoring, or when reacting to
// the notification of an event and wanting to explore it.  Because it
// automatically updates, when you receive a signal of an alarm or critical
// event, going to this console should provide a more immediate view of the
// situation.  The console itself has ways to visually and audibly signal you
// to new events.
//
// This is *not* meant to be a replacement for the main ZoneMinder console,
// but merely provides an enhanced view.  You still need the main console
// to access all the details and settings and the other original and useful
// views.

//--------------------
// Iframes

// Within the console HTML layout (arc-console.php), there are 3 iframes
// that have independent activity and semi-independnt updating.
//
//   o Live Video Iframe - Used to display a live feed from one (or more)
//     of the monitors.  The view will change to the monitor if there is
//     activity occurring. There are also controls that allow the user to
//     manually select the live video feed from different monitors and
//     enable/disable individual monitors.  The user can also choose to
//     view all the monitors in a montage, or can choose to to cycle
//     through all the views. 
//        - Views: arc-watch.{php,js}, arc-montage.{php,js}
//
//   o Event Listing Iframe - This is refreshed with the latest events from
//     all monitors each time a new event is found.  The user can also use
//     this to browse events and select them for viewing.  The
//     auto-updating of this iframe with latest events is suspended if the
//     user is interacting with this pane, but it will resume auto-updating
//     when the user interactions are far enough in the past.
//       - Views: arc-events.{php,js}
//
//   o Event Video Iframe - Used to display the video feed for an event,
//     either from an automatic update or the user's choice from the event
//     list.
//       - Views: arc-event.{php,js}
//
// The Iframes themselves will display special zoneminder "views", that
// are adaptations of the "classic" ZoneMinder views to suit the ARC
// console. Specifically:
//
//   o arc-events - text list of latest events
//   o arc-event - video view of one event
//   o arc-watch - video view of one live feed
//   o arc-montage - video view of all live feeds
//
// The 'arc-console' view serves as the main controller.  It periodcially
// polls monitors and events to determine whether any of the iframes need
// to be udpated.
//
//--------------------
// Background polling
//
// There are two main periodic queries that are issued in the background
// that support the dynamic console features:
//
//   o Monitor Status Query - This periodically checks the monitors to see
//     if they are in an alarm (or alert) state.  If it finds an alarm (or
//     alert) it will switch the live video feed to that monitor as give a
//     low-level visual indication.  Note that an 'alarming' monitor does
//     not necessarily mean the motion is important.  The severity and
//     duration will dictate whether it is important.  It is for this
//     reason that we refrain from an audible signal, and leave that for
//     the other background polling thread that will have more information
//     about the event.  Note that to prevent conflict with the user, the
//     auto-switching of the live feed is suppressed if the user has
//     recently manually selected a particular live feed view.
//
//   o Latest Events Query - This latest events from all monitors are
//     periodically polled.  There may be no new events since the last
//     time, or it may detect new events.  When new events are detected, it
//     will refresh the event list iframe and also determine the severity
//     of the event. If the event is determined to be severe, then the
//     event's video will begin playing and a visual and audible
//     notification is made (if enabled). Note that to prevent conflict
//     with the user, the auto-switching of the event feed is suppressed if
//     the user has recently manually selected a particular event to view.
// 
//--------------------
// Asynchronous Timers
//
//   o live view cycle timer - active only if user has selected to cycle
//     through the monitors' live feeds and controls switching between
//     them.
//
//   o user interaction timer - set (or reset) when the user performs an
//     interaction with the console that is important for changing the
//     auto-updating behavior.  When the timer expires, normal
//     auto-updating resumes.
//
//   o signal timer - used to temporarily provide a visual and/or audible
//     indication of an alarming/alerting monitor or a newly arrived
//     critical event,

//--------------------
// State Machine

// Because there are a few types of asynchronous timer-based triggers, and
// user actions, the state space of the console is non-trivial.  Tracking
// the current state and how the state should transition to the next state
// based upon the triggers and actions is needed to make sure that console
// is helpful with automatic updates, but non-invasive when the user is
// interacting with it.  This is the main complexity in this module and we
// keep a number of "state" variables so we can track the important things.

//--------------------
// Screen layout and sizing

// This console attempts to fill the entire available browser window size,
// so sets the main HTML elements' styles after the page loads from within
// JavaScript.  This removes some of the layout control from the CSS file,
// though we have tried to keep it to the minimum.  The general design
// decision here was tailoring this to a full screen display console, so
// video sizes are scaled up or down as needed to fill as much of the space
// as possible.  Just changing the browser window size gives you the
// ability to change the console's sizing.  The console also has both a
// portrait or landscape layout and uses the one appropriate for the current
// window geometry.

//========================================
// Constants
//========================================

//--------------------
// HTML tag Ids for referencing and manipulating.
//
// Note that this tells you which IDs and classes are important in the main
// arc-console.php and arc-console.css files.

// Screen has two main panes that live side-by-side: one for events and one
// for live feeds.
//
var ARC_EVENT_PANE_ID = 'arc-event-pane';
var ARC_LIVE_PANE_ID = 'arc-live-pane';

// The main iframes/views that the console controls
var ARC_EVENT_LIST_IFRAME_ID = 'arc-event-list-iframe';
var ARC_EVENT_VIDEO_IFRAME_ID = 'arc-event-video-iframe';
var ARC_LIVE_VIDEO_IFRAME_ID = 'arc-live-video-iframe';

// For enabaling and disabling monitors.
var ARC_MONITOR_STATE_SELECTOR = '.arc-live-monitor-state';

var ARC_ENABLE_ALL_ID = 'arc-enable-ALL';
var ARC_DISABLE_ALL_ID = 'arc-disable-ALL';

var ARC_WAITING_ID_PREFIX = 'arc-waiting-';
var ARC_WAITING_SELECTOR = '.arc-waiting';
var ARC_WAITING_ALL_SELECTOR = '.arc-waiting-ALL';

// These are statically drawn UI element to control the events and live
// feed.  We need to find out how much screen real estate these take when
// deciding how big to make the iframes and video streams
//
var ARC_EVENT_CONTROLS_ID = 'arc-event-controls';
var ARC_LIVE_CONTROLS_ID = 'arc-live-controls';

var ARC_MONITOR_ENABLED_ID_PREFIX = 'arc-enabled-';
var ARC_MONITOR_DISABLED_ID_PREFIX = 'arc-disabled-';

var ARC_LIVE_BUTTON_ID_PREFIX = 'arc-live-button-';
var ARC_LIVE_BUTTON_CYCLE_ID = 'arc-live-button-CYCLE';

// We give a toggle ability to show more or less events in the event list,
// so we need to adjust the css classes to show/hide the control buttons as
// appropriate.
var ARC_LESS_EVENTS_CONTROL_ID = 'arc-event-less';
var ARC_MORE_EVENTS_CONTROL_ID = 'arc-event-more';

// For signaling (warning/critical)
var ARC_TURN_SIGNALS_ON_BUTTON_ID = 'arc-turn-signals-on';
var ARC_TURN_SIGNALS_OFF_BUTTON_ID = 'arc-turn-signals-off';

// For warning/critical signal audio and control buttons
var ARC_SIGNAL_AUDIO_ID = 'arc-signal-audio';
var ARC_TURN_SOUND_ON_BUTTON_ID = 'arc-turn-sound-on';
var ARC_TURN_SOUND_OFF_BUTTON_ID = 'arc-turn-sound-off';

var ARC_BUTTON_STATE_ATTR = 'state';
var ARC_BUTTON_STATE_ACTIVE = 'active';
var ARC_BUTTON_STATE_INACTIVE = 'inactive';

var ARC_BUTTON_SIGNAL_CLASS = 'arc-button-signal';

// For dynamically hiding and showing elements.
var ARC_HIDDEN_CLASS = 'arc-hidden';

// States for attributes in live views (arc-watch and arc-montage) to
// set the message types (use in their CSS).
var ARC_ALARM_STATE = "alarm";
var ARC_ALERT_STATE = "alert";

//========================================
// State variables
//========================================

// Is the "event" video iframe showing something the user has recently
// selected? If not, this will be true and we will auto-update the live
// video.
//
var ARC_EventRefreshAutomatic = true;

// We do not auto-refresh the event list and event video if the user is
// intertacting with it. So new events arriving might not be reflected in
// the UI display.  This variable is set when new, undisplayed events
// exists so that when the user is done interacting, we know that the
// screen needs to be refreshed.
//
var ARC_EventRefreshPending = false;

// Is the "live" video iframe showing something the user selected? If not,
// then we will auto-update the event list and event video.
//
var ARC_LiveRefreshAutomatic = true;

// Whether or not the user has chosen to cycle through the live
// feeds from all the monitors.
//
var ARC_LiveVideoCycling = false;

// A map with keys being the event ids seen in the latest event polling
// query.  The values of the map are just true/false as we use this
// as a lookup table.
//
var ARC_LatestEventIdMap = {};

// What event is the latest event from the latest event polling.  We default
// to showing the event video for this when there is no critical events
// to be found.
//
var ARC_LatestEventId = -1;

// When the live video pane is showing the montage of all monitors (a.k.a.,
// cameras), the ARC_CurrentMonitorId will be set to this special value.
//
var ARC_ALL_MONITOR_ID = 'ALL';

// What camera is currently being viewed in the live feed video iframe
//
var ARC_CurrentMonitorId = null;

// The event id of the event video being played in the event video iframe.
//
var ARC_CurrentVideoEventId = null;

// Since we do not always auto-update the event video, we need to remember the
// last critical event, since upon resumption of auto-updating, we will
// want to ensure this can get played.
//
var ARC_LatestCriticalEventId = null;

// This gets set after we get the first response to the latest events
// polling to indicate that we have just launched the console. We suppress
// certain behaviors on startup.
//
var ARC_FirstLatestEventsHandled = false;

// This gets set after we get the first response from the monitor status
// polling to indicate that we have launched the console. We suppress
// certain behaviors on startup.
//
var ARC_FirstMonitorStatusHandled = false;

// User can toggle signals on and off. This is for all signal: warning and
// critical.
//  var ARC_SignalsEnabled = true;  DEFINED IN arc-console.js.php !!

// An event has to have at least this many alarm frames for us to consider
// a "critical signal" for the event.
//  
// FIXME: Eventually might want to make this adjustable by the user.
//
var ARC_CRITICAL_ALARM_FRAMES_THRESHOLD = 10;

// How many events to show in the event list table and the values used
// for "more" and "less".
//
// FIXME: Might want to make this adjustable and/or remembering the last
// setting the user used in a cookie.
//
var ARC_EVENT_LIST_LIMIT_LESS = 10;
var ARC_EVENT_LIST_LIMIT_MORE = 50;
var ARC_EventListLimit = ARC_EVENT_LIST_LIMIT_LESS;

//========================================
// Main Function
//========================================

//--------------------
// Called on the page body onload event
function ARC_handlePageLoaded( ) {
    ARC_setConsoleLayout();
 
    ARC_queryMonitorStatus();
    ARC_queryLatestEvents();

    // Ensures the the recurring monitor status and latest event queries
    // continue even if there is some error that prevents the next timeout
    // timer from being started.
    ARC_watchdogInit();
}

//========================================
// Monitor Query Functions (periodic)
//========================================

//--------------------
// Timer for querying monitor states - for alarms and whether alarms
// disabled or enabled for each monitor.

// FIXME: Eventually might want to allow this to be adjustable.  We could
// use the same config setting that the "classic" ZM console uses, but I
// can also see the need to use both consoles and have them on different
// update schedules.
//
var ARC_MONITOR_QUERY_TIMER_INTERVAL_MS = 5000;

var ARC_MonitorQueryTimer = null;

// The "view" used to fetch the monitor status as JSON data
var ARC_statusCmdParams = "view=arc-status";
var ARC_statusCmdReq = new Request.JSON( { url: thisUrl, method: 'post', timeout: AJAX_TIMEOUT, link: 'cancel', onSuccess: ARC_parseStatusCmdResponse } );

var ARC_MonitorQueryCounter = 0;
 
//--------------------
// Initiates the monitor status request (async ajax)
function ARC_queryMonitorStatus() 
{
    // Cancel any outstanding timer
    if ( ARC_MonitorQueryTimer ) {
	   clearTimeout( ARC_MonitorQueryTimer );
	   ARC_MonitorQueryTimer = null;
    }
    
    ARC_statusCmdReq.send( ARC_statusCmdParams );
}

//--------------------
// The Ajax callback for periodic call to get monitor state info.
function ARC_parseStatusCmdResponse( respObj, respText )
{
    ARC_watchdogOk("monitorStatus");
    ARC_MonitorQueryCounter += 1;
    
    try {

	   if ( ARC_MonitorQueryTimer ) {
		  clearTimeout( ARC_MonitorQueryTimer );
		  ARC_MonitorQueryTimer = null;
	   }
 
	   ARC_DEBUG( "MonitorStatus: "+JSON.stringify( respObj ));

	   var alarmMonitorIds = [];
	   var alertMonitorIds = [];
	   var allDisabled = true;
	   var allEnabled = true;
	   for ( var i = 0; i < respObj.length; i++ ) {
		  var monitorStatus = respObj[i];
		  
		  var monitorId = monitorStatus['Id'];
		  var func = monitorStatus['Func'];

		  // The values for 'func' are as follows:
		  //
		  //    2 = Monitor
		  //    3 = Modect
		  //    4 = Record
		  //    5 = Mocord
		  //    6 = Nodect
		  //
		  // We only use 'Monitor' and 'Modect' in the console
		  if (( func != "3" ) && ( func != "2" ))
			 continue;

		  // TrgStates: 0 = enabled, 1 = forced, 2 = disabled
		  var triggerState = monitorStatus['TrgState'];

		  if ( triggerState == 2 ) {
			 ARC_setMonitorEnabled( monitorId, false );
			 allEnabled = false;
		  }
		  else {
			 ARC_setMonitorEnabled( monitorId, true );
			 allDisabled = false;
		  }

		  // States: 0 = OK, 1 = PREALARM, 2 = ALARM, 3 = ALERT
		  var state = monitorStatus['State'];

		  if ( state == 2 ) {
			 alarmMonitorIds.push( monitorId );
			 ARC_setLiveVideoMessage( monitorId, 
								 ARC_ALARM_TEXT, ARC_ALARM_STATE )
		  }
		  else if ( state == 3 ) {
			 alertMonitorIds.push( monitorId );
			 ARC_setLiveVideoMessage( monitorId, 
								 ARC_ALERT_TEXT, ARC_ALERT_STATE )
		  }
		  else {
			 ARC_clearLiveVideoMessage( monitorId );
		  }
			 

	   } // for i

	   ARC_updateAllEnableDisableButtons( allEnabled, allDisabled );

	   if ( alarmMonitorIds.length > 0 ) {
		  ARC_DEBUG( "MonitorStatus: Has alarms: "
					 +JSON.stringify( alarmMonitorIds ));
		  ARC_handleMonitorSignal( alarmMonitorIds );
		  return;
	   }

	   if ( alertMonitorIds.length > 0 ) {
		  ARC_DEBUG( "MonitorStatus: Has alerts: "
					 +JSON.stringify( alarmMonitorIds ));
		  ARC_handleMonitorSignal( alertMonitorIds );
		  return;
	   }

	   ARC_DEBUG( "MonitorStatus: No alarms or alerts: "
				  +JSON.stringify( alarmMonitorIds ));

	   // If nothing is in alarm/alert at startup, then show
	   // montage.
	   if ( ! ARC_FirstMonitorStatusHandled )
		  ARC_changeCurrentMonitorId( ARC_ALL_MONITOR_ID );
	   return;

    }
    catch (e) {
	   ARC_logEvent( "Exception parsing monitor status: " + e
				+ " (line="+e.lineNumber+")" );
    }
    finally {
	   ARC_FirstMonitorStatusHandled = true;
	   var timeout = ARC_MONITOR_QUERY_TIMER_INTERVAL_MS;
	   ARC_MonitorQueryTimer = ARC_queryMonitorStatus.delay(timeout);
    }
}

//--------------------
function ARC_updateAllEnableDisableButtons( allEnabled, allDisabled ) {

    try {
	   $$(ARC_WAITING_ALL_SELECTOR).addClass(ARC_HIDDEN_CLASS);
	   
	   if ( allEnabled ) {
		  $(ARC_DISABLE_ALL_ID).removeClass(ARC_HIDDEN_CLASS);
		  $(ARC_ENABLE_ALL_ID).addClass(ARC_HIDDEN_CLASS);
	   }
	   else if ( allDisabled ) {
		  $(ARC_ENABLE_ALL_ID).removeClass(ARC_HIDDEN_CLASS);
		  $(ARC_DISABLE_ALL_ID).addClass(ARC_HIDDEN_CLASS);
	   }
	   else {
		  $(ARC_ENABLE_ALL_ID).removeClass(ARC_HIDDEN_CLASS);
		  $(ARC_DISABLE_ALL_ID).removeClass(ARC_HIDDEN_CLASS);
	   }
    }
    catch (e) {
	   ARC_logEvent( "Exception updating al-l enable/disable buttons: " + e);
    }
}

//--------------------
function ARC_handleMonitorSignal( monitorIdList ) {
    if ( monitorIdList.length == 0 )
	   return;

    ARC_startSignal( false, monitorIdList );

    // Only re-load the live video with the recent event's monitor if
    // the user has not recently been interacting with the live video
    // are.  We also do not switch to the single camera view if we are
    // seeing the full montage (since we definitionally will already be
    // looking at the live feed of the event.)
    //
    if ( ARC_LiveRefreshAutomatic
	    && ( ARC_CurrentMonitorId != ARC_ALL_MONITOR_ID )) {
	   ARC_DEBUG("Live refresh automatic. Loading live iframes.");
	   ARC_resetLiveCycleIfNeeded();

	   if ( monitorIdList.length == 1 )
		  ARC_changeCurrentMonitorId( monitorIdList[0] );
	   else
		  ARC_changeCurrentMonitorId( ARC_ALL_MONITOR_ID );		  
    }
    else {
	   ARC_logEvent("Live iframes not auto-loaded.");
    }
    
}

//========================================
// Latest Event Query Functions (periodic)
//========================================

//--------------------
// Timer for querying latest events

var ARC_LATEST_EVENT_QUERY_TIMER_INTERVAL_MS = 10000;

var ARC_LatestEventsQueryTimer = null;

var ARC_latestEventsCmdParams = "view=arc-events-latest";
var ARC_latestEventsCmdReq = new Request.JSON( { url: thisUrl, method: 'post', timeout: AJAX_TIMEOUT, link: 'cancel', onSuccess: ARC_parseLatestEventsCmdResponse } );

var ARC_LatestEventsCounter = 0;

//--------------------
function ARC_queryLatestEvents() 
{
    // Cancel any outstanding timer
    if ( ARC_LatestEventsQueryTimer ) {
	   clearTimeout( ARC_LatestEventsQueryTimer );
	   ARC_LatestEventsQueryTimer = null;
    }
    
    ARC_latestEventsCmdReq.send( ARC_latestEventsCmdParams );
}

//--------------------
function ARC_parseLatestEventsCmdResponse( respObj, respText )
{
    ARC_watchdogOk("latestEvents");
    ARC_LatestEventsCounter += 1;

    try {

	   if ( ARC_LatestEventsQueryTimer ) {
		  clearTimeout( ARC_LatestEventsQueryTimer );
		  ARC_LatestEventsQueryTimer = null;
	   }

	   ARC_DEBUG( "LatestEvents: "+JSON.stringify( respObj ));

	   if ( respObj.length < 1 ) {
		  ARC_DEBUG( "No latest events. Skipping logic." );
		  if ( ! ARC_FirstLatestEventsHandled )
			 ARC_handleNoEventsOnStartup();
		  return;
	   }
	   
	   // These will be in reverse time order, so we find the first one
	   // (if any) that is both new and that meets the threshold.
	   //

	   var seenNewEvent = false;
	   var isCritical = false;
	   var criticalEventId = null;
	   var criticalMonitorId = null;

	   // Accumulate the ids in this response, to later be compared
	   // against those in the call after this one.
	   //
	   var currentEventIdMap = {};

	   for ( var i = 0; i < respObj.length; i++ ) {
		  var event = respObj[i];
		  var eventIdStr = event['Id'];
		  currentEventIdMap[eventIdStr] = true;
		  
		  if ( eventIdStr in ARC_LatestEventIdMap )
			 continue;
		  seenNewEvent = true;

		  var eventId = parseInt( eventIdStr );

		  var numFrames = parseInt(event['AlarmFrames']);
		  ARC_DEBUG( "EventId="+eventId+", numFrames=" + numFrames );

		  var cause = null;
		  if ( numFrames >= ARC_CRITICAL_ALARM_FRAMES_THRESHOLD )
			 cause = "THRESHOLD";
		  
		  // Regardless of the ARC Console threshold, if we find a new
		  // event that the user was notifed about, then that will also
		  // trigger a critical signal. Note that this often does not
		  // happen because there seems to be a gap between when the
		  // events ends and when it gets flagged as having been emailed
		  // or messaged.  SO we more than likely find it with the ARC
		  // Console than the notification setting.
		  
		  if (( event['Emailed'] == 1 )
			 || ( event['Messaged'] == 1 ))
			 cause = "NOTIFICATION";
		  
		  // We only pay attention to the first critical event we
		  // have seen.
		  if ( isCritical )
			 continue;

		  if ( cause ) {
			 ARC_DEBUG( "EventId="+eventId+", Cause="+cause
						+ ", Emailed="+event['Emailed']
						+ ", Messaged="+event['Messaged']);
			 isCritical = true;
			 criticalEventId = eventId;
			 criticalMonitorId = event['MonitorId'];
		  }

	   } // for i


	   if ( ! seenNewEvent ) {
		  ARC_DEBUG( "No new events seen." );
		  return;
	   }

	   ARC_LatestEventIdMap = currentEventIdMap;

	   // No signals on startup
	   if ( ARC_FirstLatestEventsHandled && isCritical ) 
		  ARC_startSignal( isCritical, [ criticalMonitorId ] );

	   // We always set the latest event id regardless of whether it
	   // critical or not.
	   //
	   ARC_LatestEventId = parseInt(respObj[0]['Id']);

	   if ( isCritical )
		  ARC_LatestCriticalEventId = criticalEventId;

	   // Only re-load event-related if use has not been recently 
	   // interacting with them.
	   if ( ARC_EventRefreshAutomatic ) {
		  ARC_DEBUG("Event refresh automatic. Loading event iframes.");
		  if ( isCritical )
			 ARC_CurrentVideoEventId = criticalEventId;
		  ARC_loadEventListIframe();

		  // Only play the event video if it is a critical event
		  if ( isCritical )
			 ARC_loadEventVideoIframe( criticalEventId );

		  ARC_EventRefreshPending = false;
	   }
	   // Need to remember that we did not updater the event list with
	   // the latest events so we can update it when the user 
	   // has not interacted with the console for a while.
	   else {
		  ARC_DEBUG("Event iframes not auto-loaded.");
		  ARC_EventRefreshPending = true;
	   }

    }
    catch (e) {
	   ARC_logEvent( "Exception parsing latest events: " + e );
    }
    finally {
	   ARC_FirstLatestEventsHandled = true;
	   var timeout = ARC_LATEST_EVENT_QUERY_TIMER_INTERVAL_MS;
	   ARC_LatestEventsQueryTimer = ARC_queryLatestEvents.delay(timeout);
    }
}

//--------------------
function ARC_handleNoEventsOnStartup() {
    ARC_loadEventListIframe();            
}

//========================================
// Live Monitor Interactions
//========================================

//--------------------
function ARC_handleLiveNameClick( monitorId ) {

    if ( ! monitorId )
	   return;

    ARC_DEBUG("Live monitor click handled. monitorId="+monitorId);

    ARC_cancelLiveCycle();

    if ( monitorId != ARC_ALL_MONITOR_ID )
    {
	   // User interaction will temporarily stop auto-updating of event list
	   // and event video. This does not appy for view all monitors.
	   ARC_LiveRefreshAutomatic = false;
	   ARC_startUserActivityTimer();
    }

    ARC_changeCurrentMonitorId( monitorId );
}

//--------------------
function ARC_changeCurrentMonitorId( monitorId ) {
//    alert( "ARC_changeCurrentMonitorId: monitorId="+monitorId+", viewMonitorSrc="+viewMonitorSrc );

    if ( monitorId == ARC_CurrentMonitorId )
	   return;

    // Make all rows inactive first, the make the current one
    // active
    if ( ARC_CurrentMonitorId )
	   $(ARC_LIVE_BUTTON_ID_PREFIX+ARC_CurrentMonitorId).setProperty( ARC_BUTTON_STATE_ATTR, ARC_BUTTON_STATE_INACTIVE );
    $(ARC_LIVE_BUTTON_ID_PREFIX+monitorId).setProperty( ARC_BUTTON_STATE_ATTR, ARC_BUTTON_STATE_ACTIVE );

    ARC_CurrentMonitorId = monitorId;

    ARC_reloadCurrentLiveVideo( );
}

//--------------------
function ARC_reloadCurrentLiveVideo( ) {

    if ( ! ARC_CurrentMonitorId )
	   return;

    var viewMonitorSrc;
    if ( ARC_CurrentMonitorId == ARC_ALL_MONITOR_ID )
    {
	   viewMonitorSrc = '?view=arc-montage';
	   viewMonitorSrc += "&videoWidth="+ARC_LiveVideoSize['width']
		  +"&videoHeight="+ARC_LiveVideoSize['height'];
    }
    else
    {
	   viewMonitorSrc = '?view=arc-watch&mid='+ARC_CurrentMonitorId;
	   viewMonitorSrc += "&videoWidth="+ARC_LiveVideoSize['width']
		  +"&videoHeight="+ARC_LiveVideoSize['height'];
    }

    ARC_loadIframe( ARC_LIVE_VIDEO_IFRAME_ID, viewMonitorSrc );
}

//--------------------
function ARC_setLiveVideoMessage( monitorId, msg, state ) {
    var iframe = $(ARC_LIVE_VIDEO_IFRAME_ID);

    if ( iframe 
	    && iframe.contentWindow
	    && iframe.contentWindow.ARC_showMessage )
	   iframe.contentWindow.ARC_showMessage( monitorId, msg, state );

}

//--------------------
function ARC_clearLiveVideoMessage( monitorId ) {
    var iframe = $(ARC_LIVE_VIDEO_IFRAME_ID);

    if ( iframe 
	    && iframe.contentWindow 
	    && iframe.contentWindow.ARC_hideMessage )
	   iframe.contentWindow.ARC_hideMessage( monitorId );

}

//========================================
// Cycling Live Feeds
//========================================

//--------------------
function ARC_handleLiveCycleClick() {

    if ( ARC_LiveVideoCycling )
	   return;

    $(ARC_LIVE_BUTTON_CYCLE_ID).setProperty( ARC_BUTTON_STATE_ATTR,
									ARC_BUTTON_STATE_ACTIVE );

    // If we are viewing the montage of all camera, then switch to the
    // first one before beginning cycling.
    if ( ARC_CurrentMonitorId == ARC_ALL_MONITOR_ID )
	   ARC_changeCurrentMonitorId( ARC_MonitorIdList[0] );

    ARC_startLiveCycleTimer();
    ARC_LiveVideoCycling = true;

    // We define cycling as the user reliquishing control to allow any
    // incoming new events to switch the live feed.
    ARC_LiveRefreshAutomatic = true;

}

//--------------------
function ARC_cancelLiveCycle() {
    ARC_clearLiveCycleTimer();
    ARC_LiveVideoCycling = false;

    $(ARC_LIVE_BUTTON_CYCLE_ID).setProperty( ARC_BUTTON_STATE_ATTR,
									ARC_BUTTON_STATE_INACTIVE );
}

//--------------------
function ARC_doLiveCycleNext() {

    var curIndex = -1;
    for ( var i = 0; i < ARC_MonitorIdList.length; i++ ) {
	   if ( ARC_CurrentMonitorId != ARC_MonitorIdList[i] )
		  continue;
	   curIndex = i;
	   break;
    }
    
    // Note that we start at '0' if we did not find the monitor id in the
    // list.
    var nextIndex = curIndex + 1;
    if ( nextIndex >= ARC_MonitorIdList.length )
	   nextIndex = 0;

    ARC_changeCurrentMonitorId( ARC_MonitorIdList[nextIndex] );
    
    ARC_startLiveCycleTimer();
}

//--------------------
// Called when we update the live video for an event. If live cycling
// is enbled it will resume after a slightly longer display of the
// live feed from the event's monitor.
function ARC_resetLiveCycleIfNeeded() {
    if ( ! ARC_LiveVideoCycling )
	   return;

    ARC_clearLiveCycleTimer();
    ARC_startLiveCycleTimer( ARC_LIVE_CYCLE_NEW_EVENT_TIMER_INTERVAL_MS );
}

//========================================
// Monitor Enable/Disable Functions
//========================================

//--------------------
function ARC_setMonitorEnabled( monitorId, isEnabled ) {
    
    var eId = ARC_MONITOR_ENABLED_ID_PREFIX+monitorId;
    var dId = ARC_MONITOR_DISABLED_ID_PREFIX+monitorId;
    var wId = ARC_WAITING_ID_PREFIX+monitorId;
    
    $(wId).addClass(ARC_HIDDEN_CLASS);
    
    if ( isEnabled ) {
	   $(dId).addClass(ARC_HIDDEN_CLASS);
	   $(eId).removeClass(ARC_HIDDEN_CLASS);
    }
    else {
	   $(eId).addClass(ARC_HIDDEN_CLASS);
	   $(dId).removeClass(ARC_HIDDEN_CLASS);
    }
}

//--------------------
// If monitorId = 'ALL', then enable all
function ARC_handleEnableClick( monitorId ) {

    if ( monitorId == ARC_ALL_MONITOR_ID ) {
	   $$(ARC_MONITOR_STATE_SELECTOR).addClass(ARC_HIDDEN_CLASS);
	   $$(ARC_WAITING_SELECTOR).removeClass(ARC_HIDDEN_CLASS);
    }
    else {
	   var wId = ARC_WAITING_ID_PREFIX+monitorId;
	   var eId = ARC_MONITOR_DISABLED_ID_PREFIX+monitorId;
	   $(eId).addClass(ARC_HIDDEN_CLASS);
	   $(wId).removeClass(ARC_HIDDEN_CLASS);
    }
   
    ARC_sendAlarmRequest( monitorId, "enableAlarms" );
}

//--------------------
// If monitorId = 'ALL', then disable all
function ARC_handleDisableClick( monitorId ) {
    if ( monitorId == ARC_ALL_MONITOR_ID ) {
	   $$(ARC_MONITOR_STATE_SELECTOR).addClass(ARC_HIDDEN_CLASS);
	   $$(ARC_WAITING_SELECTOR).removeClass(ARC_HIDDEN_CLASS);
    }
    else {
	   var wId = ARC_WAITING_ID_PREFIX+monitorId;
	   var eId = ARC_MONITOR_ENABLED_ID_PREFIX+monitorId;
	   
	   $(eId).addClass(ARC_HIDDEN_CLASS);
	   $(wId).removeClass(ARC_HIDDEN_CLASS);
    }

    ARC_sendAlarmRequest( monitorId, "disableAlarms" );
}

//--------------------
// If monitorId = 'ALL', then send for all
function ARC_sendAlarmRequest( monitorId, cmd ) {
    
    var midList = [];
    if ( ! monitorId
	    || ( monitorId == ARC_ALL_MONITOR_ID ))
	   midList = ARC_MonitorIdList;
    else
	   midList = [ monitorId ];

    ARC_DEBUG("Sending alarm request. monitorId="+monitorId+", cmd="+cmd);

//    alert( "Alarm command '"+cmd+"'. monitorIds="+midList.join(", "));

    for ( var i = 0; i < midList.length; i++ ) {
	   var cmdParams = "view=request&request=alarm&id="+midList[i]+"&command="+cmd

//	   alert( "Alarm command: "+cmdParams );

	   var alarmCmdReq = new Request.JSON( { url: thisUrl, 
									 method: 'post', 
									 timeout: AJAX_TIMEOUT, 
									 link: 'cancel', 
									 onSuccess: function ( respObj, respText ) {
										checkStreamForErrors("getAlarmCmdResponse",respObj);
									 }
								    } );

	   alarmCmdReq.send( cmdParams );

    }
}

//========================================
// Event List Interactions
//========================================

//--------------------
function ARC_handleEventRowClick( eventId ) {

    ARC_DEBUG("Event row click handled. eventId="+eventId);

    // User interaction will temporarily stop auto-updating of event list
    // and event video
    ARC_EventRefreshAutomatic = false;
    ARC_startUserActivityTimer();

    ARC_loadEventVideoIframe( eventId );
}

//--------------------
function ARC_loadEventListIframe( ) {

    var url = '?view=arc-events';
    if ( ARC_CurrentVideoEventId != null )
	   url += '&activeEventId='+ARC_CurrentVideoEventId;
    url += '&limit='+ARC_EventListLimit;

    ARC_loadIframe( ARC_EVENT_LIST_IFRAME_ID, url );
}

//--------------------
function ARC_loadEventVideoIframe( eventId ) {

    if ( ! eventId )
	   return;

    ARC_CurrentVideoEventId = eventId;

    ARC_reloadCurrentEventVideo( );
}

//--------------------
function ARC_reloadCurrentEventVideo( ) {

    if ( ! ARC_CurrentVideoEventId )
	   return;

    var viewEventSrc = '?view=arc-event&eid='+ARC_CurrentVideoEventId;
    viewEventSrc += "&videoWidth="+ARC_EventVideoSize['width']
	   +"&videoHeight="+ARC_EventVideoSize['height'];

    ARC_loadIframe( ARC_EVENT_VIDEO_IFRAME_ID, viewEventSrc );
}

//--------------------
// Calls to this are relayed from the arc-event.js code in the iframe
function ARC_handleEventVideoClicked() {
    ARC_reloadCurrentEventVideo( );
}

//--------------------
function ARC_forceEventRefresh() {
    ARC_setUserInactive();
    ARC_forceEventListRefresh();
}

//--------------------
function ARC_showMoreEvents() {

    ARC_EventListLimit = ARC_EVENT_LIST_LIMIT_MORE;
    $(ARC_MORE_EVENTS_CONTROL_ID).addClass(ARC_HIDDEN_CLASS);
    $(ARC_LESS_EVENTS_CONTROL_ID).removeClass(ARC_HIDDEN_CLASS);
    ARC_forceEventListRefresh();

}

//--------------------
function ARC_showLessEvents() {

    ARC_EventListLimit = ARC_EVENT_LIST_LIMIT_LESS;
    $(ARC_LESS_EVENTS_CONTROL_ID).addClass(ARC_HIDDEN_CLASS);
    $(ARC_MORE_EVENTS_CONTROL_ID).removeClass(ARC_HIDDEN_CLASS);
    ARC_forceEventListRefresh();
}

//--------------------
function ARC_forceEventListRefresh() {

    // We consider this a user action that suspends automatic updates
    // of the event pane
    ARC_EventRefreshAutomatic = false;
    ARC_startUserActivityTimer();

    ARC_loadEventListIframe();		  
}

//--------------------
function ARC_disableSignals() {
    ARC_SignalsEnabled = false;
    ARC_cancelSignal();
    document.getElementById(ARC_TURN_SIGNALS_OFF_BUTTON_ID).addClass(ARC_HIDDEN_CLASS);
    document.getElementById(ARC_TURN_SIGNALS_ON_BUTTON_ID).removeClass(ARC_HIDDEN_CLASS);

    Cookie.write( ARC_SIGNALS_STATE_COOKIE, "false", { duration: 10*365 } );    
}

//--------------------
function ARC_enableSignals() {
    ARC_SignalsEnabled = true;
    document.getElementById(ARC_TURN_SIGNALS_ON_BUTTON_ID).addClass(ARC_HIDDEN_CLASS);
    document.getElementById(ARC_TURN_SIGNALS_OFF_BUTTON_ID).removeClass(ARC_HIDDEN_CLASS);

    Cookie.write( ARC_SIGNALS_STATE_COOKIE, "true", { duration: 10*365 } );    
    
}

//========================================
// Window Size and Layout Management
//========================================

var ARC_ConsoleLayoutSet = false;

// If we detect a window smaller than these dimensions, we will use these
var ARC_MIN_WINDOW_WIDTH = 700;
var ARC_MIN_WINDOW_HEIGHT = 500;

// What percentage of the screen the main areas takes up in both
// portrait and landscape modes
var ARC_LIVE_PANE_WIDTH_SCALE_LANDSCAPE = 0.64;
var ARC_LIVE_PANE_HEIGHT_SCALE_LANDSCAPE = 0.99;
var ARC_EVENT_PANE_WIDTH_SCALE_LANDSCAPE = 0.34;
var ARC_EVENT_PANE_HEIGHT_SCALE_LANDSCAPE = 0.99;

var ARC_LIVE_PANE_WIDTH_SCALE_PORTRAIT = 0.99;
var ARC_LIVE_PANE_HEIGHT_SCALE_PORTRAIT = 0.59;
var ARC_EVENT_PANE_WIDTH_SCALE_PORTRAIT = 0.99;
var ARC_EVENT_PANE_HEIGHT_SCALE_PORTRAIT = 0.39;

var ARC_EVENT_LIST_HEIGHT_SCALE = 0.35;

// Use this to make some siggle room in calculations. These (unfortunately)
// need to be in sync with arc-console.css.
var ARC_PAGE_MARGIN_PIXELS = 5;
var ARC_PANE_MARGIN_PIXELS = 2;
var ARC_IFRAME_MARGIN_PIXELS = 2;

// Where we store the video sizes to fit layout to screen size
var ARC_WindowSize = {};
var ARC_EventVideoSize = {};
var ARC_LiveVideoSize = {};

//--------------------
function ARC_setConsoleLayout() {

    if ( ARC_ConsoleLayoutSet )
	   return;
    ARC_ConsoleLayoutSet = true;

    ARC_WindowSize = ARC_getBrowserWindowSize();

    // Adjust for min sizes and margins before calculating pane sizes
    var winSize = ARC_WindowSize;
    if ( winSize['width'] < ARC_MIN_WINDOW_WIDTH )
	   winSize['width'] = ARC_MIN_WINDOW_WIDTH;
    if ( winSize['height'] < ARC_MIN_WINDOW_HEIGHT )
	   winSize['height'] = ARC_MIN_WINDOW_HEIGHT;

    winSize['width'] -= 2 * ARC_PAGE_MARGIN_PIXELS;
    winSize['height'] -= 2 * ARC_PAGE_MARGIN_PIXELS;

    var lpWidthScale = ARC_LIVE_PANE_WIDTH_SCALE_LANDSCAPE;
    var lpHeightScale = ARC_LIVE_PANE_HEIGHT_SCALE_LANDSCAPE;
    var epWidthScale = ARC_EVENT_PANE_WIDTH_SCALE_LANDSCAPE;
    var epHeightScale = ARC_EVENT_PANE_HEIGHT_SCALE_LANDSCAPE;

    // Check for portrait layout overrides
    if ( winSize['width'] < winSize['height'] ) {
	   lpWidthScale = ARC_LIVE_PANE_WIDTH_SCALE_PORTRAIT;
	   lpHeightScale = ARC_LIVE_PANE_HEIGHT_SCALE_PORTRAIT;
	   epWidthScale = ARC_EVENT_PANE_WIDTH_SCALE_PORTRAIT;
	   epHeightScale = ARC_EVENT_PANE_HEIGHT_SCALE_PORTRAIT;
    }

    var elHeightScale = ARC_EVENT_LIST_HEIGHT_SCALE;

    var ecHeight = document.getElementById(ARC_EVENT_CONTROLS_ID).clientHeight;
    var lcHeight = document.getElementById(ARC_LIVE_CONTROLS_ID).clientHeight;

    var elem;

    elem = document.getElementById(ARC_EVENT_PANE_ID);
    elem.style.width = Math.floor(winSize['width'] * epWidthScale)+"px";

    elem = document.getElementById(ARC_LIVE_PANE_ID);
    elem.style.width = Math.floor(winSize['width'] * lpWidthScale)+"px";

    elem = document.getElementById(ARC_EVENT_LIST_IFRAME_ID);
    elem.style.height = Math.floor(winSize['height'] * epHeightScale * elHeightScale)+"px";

    var eventIframeWidth = Math.floor(winSize['width'] * epWidthScale) - ( 2 * ARC_PANE_MARGIN_PIXELS );
    var eventIframeHeight = Math.floor(winSize['height'] * epHeightScale * (1.0 - elHeightScale)) - ecHeight - ( 2 * ARC_PANE_MARGIN_PIXELS );

    ARC_EventVideoSize['width'] = eventIframeWidth - ( 2 * ARC_IFRAME_MARGIN_PIXELS );
    ARC_EventVideoSize['height'] = eventIframeHeight - ( 2 * ARC_IFRAME_MARGIN_PIXELS );

    elem = document.getElementById(ARC_EVENT_VIDEO_IFRAME_ID);
    elem.style.width = eventIframeWidth+"px";
    elem.style.height = eventIframeHeight+"px";

    var liveIframeWidth = Math.floor(winSize['width'] * lpWidthScale) - ( 2 * ARC_PANE_MARGIN_PIXELS );
    var liveIframeHeight = Math.floor( winSize['height'] * lpHeightScale ) - lcHeight - ( 2 * ARC_PANE_MARGIN_PIXELS );

    ARC_LiveVideoSize['width'] = liveIframeWidth - ARC_IFRAME_MARGIN_PIXELS;
    ARC_LiveVideoSize['height'] = liveIframeHeight - ARC_IFRAME_MARGIN_PIXELS;

    elem = document.getElementById(ARC_LIVE_VIDEO_IFRAME_ID);
    elem.style.width = liveIframeWidth+"px";
    elem.style.height = liveIframeHeight+"px";

    ARC_DEBUG( ARC_getWindowInfo() );
}

//--------------------
// Returns a hash: [ "width": width, "height": height ]
function ARC_getBrowserWindowSize() {

    // Adapted from: http://www.javascripter.net/faq/browserw.htm

    var winW = 630, winH = 460;
    if (document.body && document.body.offsetWidth) {
	   winW = document.body.offsetWidth;
	   winH = document.body.offsetHeight;
    }
    if (document.compatMode=='CSS1Compat' &&
	   document.documentElement &&
	   document.documentElement.offsetWidth ) {
	   winW = document.documentElement.offsetWidth;
	   winH = document.documentElement.offsetHeight;
    }
    if (window.innerWidth && window.innerHeight) {
	   winW = window.innerWidth;
	   winH = window.innerHeight;
    }

    var size = {};
    size['width'] = winW;
    size['height'] = winH;
    return size;
}

//========================================
// Window Re-size handling
//========================================

// We delay handling resize events to prevent rapid fire sequences that
// occur while window is being resized.
//
var ARC_WINDOW_RESIZE_DELAY_MS = 2000;

var ARC_WindowResizeTimer = null;

// Ignore resize events at startup since these get fired before things are
// settled.
//
var ARC_StartTime = new Date();

//--------------------
function ARC_handleWindowResizeEvent() {

    var currentTime = new Date();

    if ( (currentTime.getTime() 
		- ARC_StartTime.getTime()) < ARC_WINDOW_RESIZE_DELAY_MS )
	   return;
    
    if ( ARC_WindowResizeTimer != null )
	   clearTimeout( ARC_WindowResizeTimer );

    ARC_WindowResizeTimer = setTimeout( ARC_handleWindowResizeDone,
								ARC_WINDOW_RESIZE_DELAY_MS );
}

//--------------------
function ARC_handleWindowResizeDone() {

    ARC_DEBUG( "Window resize timer now done." );

    clearTimeout( ARC_WindowResizeTimer );
    ARC_WindowResizeTimer = null;

    ARC_ConsoleLayoutSet = false;
    ARC_setConsoleLayout();

    // The videos that are currently rendered and playing are not resized
    // easily, so easiest to just reload them to get them to adjust to
    // the correct size for the new layout.
    ARC_reloadCurrentLiveVideo( );
    ARC_reloadCurrentEventVideo( );

}

// Main deal to get hooked intot he resize events.
window.onresize = ARC_handleWindowResizeEvent;

// Found I also needed this for iPad/Safari
window.onorientationchange = ARC_handleWindowResizeEvent;

//========================================
// Signal Notification Timer and Logic
//========================================

// Timer for signalling alarming monitors or critcial events

// The HTML elementid we will toggle a css class on to highlight
var ARC_PAGE_SIGNAL_ID = "page";

// We set a value for this attribute on the page to alter the background
// color as the visual signal.
var ARC_SIGNAL_ATTR_NAME = "signal";

// How long do we continue the highlighting for new events
var ARC_SIGNAL_DURATION_MS = 10000;

// This controls the rate of "flashing" for the visual notifcation
var ARC_SIGNAL_INTERVAL_MS = 250;

var ARC_SignalTimer = null;
var ARC_NewEventFlashingTimer = null;

// We toggle this value to add and remove the attribute that wil alter the
// background color.
ARC_SignalFlashingState = false;

// Two notification types depending on the severity of the motion event.
// This tells us whether we are in the process of signalling for one or the
// other.  We use different visual and audible signals for these.
//
var ARC_SIGNAL_NONE = "none";
var ARC_SIGNAL_WARNING = "warning";
var ARC_SIGNAL_CRITICAL = "critical";
var ARC_CurrentSignalState = ARC_SIGNAL_NONE;

function ARC_startSignal( isCritical, monitorIdList ) {

    // Do not let a warning signal override a critical signal, nor do we
    // let one critical signal stomp on another.
    //
    if ( ARC_CurrentSignalState == ARC_SIGNAL_CRITICAL )
	   return;

    // Don't let one warning stomp on another
    if ( ! isCritical && ( ARC_CurrentSignalState == ARC_SIGNAL_WARNING ))
	   return;

    // In case we are already in the warning state, but want to emit a
    // critical signal
    ARC_cancelSignal();

    ARC_signalMonitorButtons( monitorIdList );

    if ( isCritical )
	   ARC_CurrentSignalState = ARC_SIGNAL_CRITICAL;
    else
	   ARC_CurrentSignalState = ARC_SIGNAL_WARNING;

    if ( ! ARC_SignalsEnabled )
	   return;

    ARC_startVisualSignal();

    ARC_clearSignalTimer();
    ARC_SignalTimer = setTimeout( ARC_cancelSignal, 
						    ARC_SIGNAL_DURATION_MS );

    // We only emit sounds for "critical", not "warning" signals
    if ( ARC_CurrentSignalState == ARC_SIGNAL_CRITICAL )
	   ARC_startAudibleSignal();

    ARC_DEBUG( "New signal timer started.");
}

function ARC_cancelSignal() {
    ARC_stopAudibleSignal();
    ARC_clearSignalTimer();
    $(ARC_PAGE_SIGNAL_ID).removeProperty(ARC_SIGNAL_ATTR_NAME);
    ARC_clearMonitorButtons( );
    ARC_stopVisualSignal();
    ARC_CurrentSignalState = ARC_SIGNAL_NONE;
    ARC_DEBUG( "New signal timer cancelled.");
}

function ARC_clearSignalTimer() {
    if ( ARC_SignalTimer == null )
	   return;
    clearTimeout( ARC_SignalTimer );
    ARC_SignalTimer = null;
}

function ARC_startVisualSignal() {

    if ( ARC_SignalFlashingState )
	   $(ARC_PAGE_SIGNAL_ID).removeProperty(ARC_SIGNAL_ATTR_NAME);
    else
	   $(ARC_PAGE_SIGNAL_ID).setProperty( ARC_SIGNAL_ATTR_NAME,
								   ARC_CurrentSignalState);
	   
    ARC_SignalFlashingState = ! ARC_SignalFlashingState;

    ARC_clearNewEventFlashingTimer();
    ARC_NewEventFlashingTimer = setTimeout( ARC_startVisualSignal,
								    ARC_SIGNAL_INTERVAL_MS );

}

function ARC_stopVisualSignal() {
    ARC_clearNewEventFlashingTimer();
    ARC_SignalFlashingState = false;
}

function ARC_clearNewEventFlashingTimer() {
    try {
	   if ( ARC_NewEventFlashingTimer == null )
		  return;
	   clearTimeout( ARC_NewEventFlashingTimer );
	   ARC_NewEventFlashingTimer = null;
    }
    catch (e) {
	   ARC_logEvent( "Exception clearing flashing timer: " + e);
    }
}

function ARC_signalMonitorButtons( monitorIdList ) {
    try {
	   for ( var i = 0; i < monitorIdList.length; i++ ) {
		  var monitorId = monitorIdList[i];
		  var id = ARC_LIVE_BUTTON_ID_PREFIX+monitorId;
		  $(id).addClass( ARC_BUTTON_SIGNAL_CLASS );
	   }
    }
    catch (e) {
	   ARC_logEvent( "Exception signalling monitor buttons: " + e);
    }
}

function ARC_clearMonitorButtons() {
    try {
	   for ( var i = 0; i < ARC_MonitorIdList.length; i++ ) {
		  var monitorId = ARC_MonitorIdList[i];
		  var id = ARC_LIVE_BUTTON_ID_PREFIX+monitorId;
		  $(id).removeClass( ARC_BUTTON_SIGNAL_CLASS );
	   }
    }
    catch (e) {
	   ARC_logEvent( "Exception clearing monitor buttons: " + e);
    }
}


//--------------------
// New critical event sound

// For controling sound state
//    var ARC_SoundsEnabled = true;   DEFINED IN arc-console.js.php !!

function ARC_enableSound() {
    ARC_SoundsEnabled = true;
    document.getElementById(ARC_TURN_SOUND_ON_BUTTON_ID).addClass(ARC_HIDDEN_CLASS);
    document.getElementById(ARC_TURN_SOUND_OFF_BUTTON_ID).removeClass(ARC_HIDDEN_CLASS);

    Cookie.write( ARC_SOUNDS_STATE_COOKIE, "true", { duration: 10*365 } );    
}

function ARC_disableSound() {
    ARC_SoundsEnabled = false;
    ARC_stopAudibleSignal( );
    document.getElementById(ARC_TURN_SOUND_OFF_BUTTON_ID).addClass(ARC_HIDDEN_CLASS);
    document.getElementById(ARC_TURN_SOUND_ON_BUTTON_ID).removeClass(ARC_HIDDEN_CLASS);

    Cookie.write( ARC_SOUNDS_STATE_COOKIE, "false", { duration: 10*365 } );    
}

function ARC_startAudibleSignal( ) {

    // The 'SOUND_ON_ALARM' variable comes from ZoneMinder itself.  We want
    // to honor this if the user does not have sound configured or does not
    // want to use sounds.
    if ( ! ZM_WEB_SOUND_ON_ALARM )
	   return;

    if ( ! ARC_SoundsEnabled )
	   return;

    document.getElementById(ARC_SIGNAL_AUDIO_ID).play();
}

function ARC_stopAudibleSignal( ) {
    if ( ! ZM_WEB_SOUND_ON_ALARM )
	   return;

    document.getElementById(ARC_SIGNAL_AUDIO_ID).pause();
}

//========================================
// Live Monitor Cycle Timer
//========================================

// Timer for when the user selects to cycle through the monitors in
// the live feed video iframe.

// Normal interval between changing monitors when cycling through them.
var ARC_LIVE_CYCLE_TIMER_INTERVAL_MS = 20000;

// If we are cycling through videos and a new event arrives, we will change
// the display to the monitor for that event for this time period, and then
// resume cycling from that id forward.
var ARC_LIVE_CYCLE_NEW_EVENT_TIMER_INTERVAL_MS = 60000;

var ARC_LiveCycleTimer = null;

function ARC_startLiveCycleTimer( intervalMs ) {
    ARC_clearLiveCycleTimer();

    if ( ! intervalMs )
	   intervalMs = ARC_LIVE_CYCLE_TIMER_INTERVAL_MS;

    ARC_LiveCycleTimer = setTimeout( ARC_doLiveCycleNext, intervalMs );

    ARC_DEBUG( "Live feed cycle timer started. ("+intervalMs+"ms)");
}

function ARC_clearLiveCycleTimer() {
    if ( ARC_LiveCycleTimer == null )
	   return;
    clearTimeout( ARC_LiveCycleTimer );
    ARC_LiveCycleTimer = null;

    ARC_DEBUG( "Live feed cycle timer cleared.");
}

//========================================
// User Interaction Tracking Timer
//========================================

// Timer for tracking the last time a user interacted with the console
// in a way that will make us want to alter the behavior of what will
// be automatically updated.

var ARC_USER_ACTIVE_TIMEOUT_MS = 30000;

var ARC_UserActivityTimer = null;

function ARC_startUserActivityTimer() {
    ARC_clearUserActivityTimer();
    ARC_UserActivityTimer = setTimeout( ARC_setUserInactive, 
								ARC_USER_ACTIVE_TIMEOUT_MS );

    ARC_DEBUG( "User activity timer started.");
}

function ARC_clearUserActivityTimer() {
    if ( ARC_UserActivityTimer == null )
	   return;
    clearTimeout( ARC_UserActivityTimer );
    ARC_UserActivityTimer = null;
    ARC_DEBUG( "User activity timer cleared.");
}

function ARC_setUserInactive() {
    ARC_DEBUG( "User activity timer expired.");

    ARC_clearUserActivityTimer();
    ARC_EventRefreshAutomatic = true;
    ARC_LiveRefreshAutomatic = true;

    if ( ARC_EventRefreshPending ) {
	   ARC_DEBUG( "Refreshing due to pending event.");
	   ARC_loadEventListIframe();		  
	   ARC_loadEventVideoIframe( ARC_LatestEventId );
    }
}

//========================================
// Watchdog functions - ensuring main polling queries continue
//========================================

var ARC_watchdogInactive = {
    'monitorStatus': false,
    'latestEvents': false,
};

var ARC_watchdogFunctions = {
    'monitorStatus': ARC_queryMonitorStatus,
    'latestEvents': ARC_queryLatestEvents,
};

function ARC_watchdogCheck( type )
{
    ARC_DEBUG( "Watchdog check:"+type );
    if ( ARC_watchdogInactive[type] )
    {
        ARC_DEBUG( "Watchdog detected '"+type+"' stopped. Restarting." );
        ARC_watchdogFunctions[type]();
        ARC_watchdogInactive[type] = false;
    }
    else
    {
        ARC_watchdogInactive[type] = true;
    }
}

function ARC_watchdogOk( type )
{
    ARC_watchdogInactive[type] = false;
}

function ARC_watchdogInit( )
{
    ARC_watchdogCheck.pass('monitorStatus').periodical(2*ARC_MONITOR_QUERY_TIMER_INTERVAL_MS);
    ARC_watchdogCheck.pass('latestEvents').periodical(2*ARC_LATEST_EVENT_QUERY_TIMER_INTERVAL_MS);
}

//========================================
// Utility Functions
//========================================

//--------------------
function ARC_loadIframe( iframeId, urlQueryParams ) {
//    alert( "LOAD! iframeId=" + iframeId + ", urlQueryParams=" + urlQueryParams );

    ARC_setIframeToWaiting( iframeId );

    var iframe = document.getElementById(iframeId);
    if ( ! iframe ) {
	alert( "Cannot find iframe with id="+iframeId );
	return;
    }

    iframe.setAttribute('src', urlQueryParams );

}

//--------------------
// Quickly change the iframe to a 'waiting view" for times when it might
// take a few seconds to reload the iframe.  We want to provide the user 
// more immediate feedback that their "click" action was registered and
// avoid any race conditions with clicks in the iframe in between loads.
//

var ARC_IFRAME_WAITING_CSS = "width: 90%; font-style: italic; text-align: center; margin: 1em; padding: 15% 0 15% 0; color: #a0a0a0; font-size: 1.5em; font-weight: bold; border: 1px solid #a0a0a0;";

var ARC_IFRAME_WAITING_HTML = "<html><head></head><body>";
ARC_IFRAME_WAITING_HTML += '<div style="'+ARC_IFRAME_WAITING_CSS+'">'+ARC_WAITING_TEXT+'</div>';
ARC_IFRAME_WAITING_HTML += "</body></html>";

function ARC_setIframeToWaiting( iframeId ) {

    try {
	   var iframe = document.getElementById(iframeId);
	   if ( ! iframe ) {
		  ARC_logEvent( "Cannot find iframe with id="+iframeId );
		  return;
	   }

	   iframe.contentWindow.document.write(ARC_IFRAME_WAITING_HTML);
	   
    } catch (e) {
	   ARC_logEvent( "Exception trying to set iframe '"
				  +iframeId+"'to waiting." );
    }


}

//--------------------
function ARC_getWindowInfo( ) {
    
    var msgList = [];
    
    msgList.push( "UserAgent="+navigator.userAgent);
    msgList.push( "ARC_WindowSize="+ARC_WindowSize['width']+"x"+ARC_WindowSize['height'] );
    msgList.push( "ARC_EventVideoSize="+ARC_EventVideoSize['width']+"x"+ARC_EventVideoSize['height'] );
    msgList.push( "ARC_LiveVideoSize="+ARC_LiveVideoSize['width']+"x"+ARC_LiveVideoSize['height'] );

    return "ARC: Window Info\n     " + msgList.join( "\n     " );
}

//========================================
// Clean up

function ARC_handleWindowUnload() {
    ARC_cancelSignal();
    ARC_clearLiveCycleTimer();
    ARC_clearUserActivityTimer();
    
    if ( ARC_MonitorQueryTimer )
        ARC_MonitorQueryTimer = clearTimeout( ARC_MonitorQueryTimer );
    
    if ( ARC_LatestEventsQueryTimer )
        ARC_LatestEventsQueryTimer = clearTimeout( ARC_LatestEventsQueryTimer )

    if ( ARC_WindowResizeTimer )
	   ARC_LatestEventsQueryTimer = clearTimeout( ARC_WindowResizeTimer );

    window.onresize = null;
    window.onorientationchange = null;
}

window.onbeforeunload = ARC_handleWindowUnload;
