// ZoneMinder (A)ctive (R)response (C)amera events view JS file, $Date:
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

// What event is currently highlighted
var ARC_CurrentEventId = null;

// Notify the parent (when in an iframe) that the page loaded and what the
// first event was at the top of the list.
//
function ARC_handleEventListPageLoaded( activeEventId ) {
    if ( ! activeEventId )
	   return;

    ARC_CurrentEventId = activeEventId;
    ARC_setCurrentEventRow( activeEventId ); 
}

//--------------------
function ARC_setCurrentEventRow( eventId ) {
    if ( ! eventId )
	   return;

    // Since the console can direct us to highlight a specific event, it is
    // possible that the event video being refreshed/played is no longer in
    // our list.  So we should guard against that.

    if ( ARC_CurrentEventId ) {
	   var oldNode = $('arc-event-row-'+ARC_CurrentEventId);
	   if ( oldNode )
		  oldNode.removeClass( 'arc-active' );
    }

    var newNode = $('arc-event-row-'+eventId);
    if ( ! newNode )
	   return;

    newNode.addClass( 'arc-active' );
    ARC_CurrentEventId = eventId;
}

//--------------------
function ARC_handleEventRowClick( eventId ) {
   if ( ! eventId )
	   return;

    ARC_setCurrentEventRow( eventId ); 

   // Guard against not loading in an iframe
    if ( ! parent
	    || ( ARC_handleEventRowClick == parent.ARC_handleEventRowClick ))
	   return;

    parent.ARC_handleEventRowClick( eventId );
}
