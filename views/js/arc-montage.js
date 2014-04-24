// ZoneMinder (A)ctive (R)response (C)amera montage view JS file, $Date:
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

var ARC_MESSAGE_ID_PREFIX = "arc-message-";
var ARC_STATE_ATTR = "state";
var ARC_HIDDEN_CLASS = "arc-hidden";

//--------------------
function ARC_handleLiveStreamClick( monitorId ) {
    
    if ( ARC_TEST_MESSAGES ) {
	   ARC_testMessage( monitorId );
	   return;
    }

    // Prevent call if not in iframe or if will resolve to a recusive call
    if ( ! parent
	    || ! parent.ARC_handleLiveNameClick
	    || ( ARC_handleLiveStreamClick == parent.ARC_handleLiveNameClick))
	   return false;

    parent.ARC_handleLiveNameClick( monitorId );

    return true;
}

//--------------------
function ARC_showMessage( monitorId, msg, state ) {
    var node = $(ARC_MESSAGE_ID_PREFIX+monitorId);
    if ( ! node )
	   return;
    node.set('text', msg );
    node.setProperty( ARC_STATE_ATTR, state );
    node.removeClass( ARC_HIDDEN_CLASS );
}

//--------------------
function ARC_hideMessage( monitorId ) {
    var node = $(ARC_MESSAGE_ID_PREFIX+monitorId);
    if ( ! node )
	   return;
    node.removeProperty( ARC_STATE_ATTR );
    node.addClass( ARC_HIDDEN_CLASS );
    node.set('text', '&nbsp;' );
}

//--------------------
// For testing

// Set this to true and clicking on one of the feds will toggle test
// messages ionstead of normal behavior.
//
var ARC_TEST_MESSAGES = false;

var testMessageState = {};

function ARC_testMessage( monitorId ) {

    if ( testMessageState[monitorId] )
	   ARC_hideMessage( monitorId );
    else {
	   if ( Math.random() < 0.33 )
		  state = "alarm";
	   else if ( Math.random() < 0.5 )
		  state = "alert";
	   else
		  state = "subtle";
	   
	   ARC_showMessage( monitorId, "Test Message", state );
    }
    
    testMessageState[monitorId] = ! testMessageState[monitorId];
}

