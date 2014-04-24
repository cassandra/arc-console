<?php
//
// ZoneMinder web watch feed view file, $Date: 2011-02-06 16:04:11 +0000 (Sun, 06 Feb 2011) $, $Revision: 3281 $
// Copyright (C) 2001-2008 Philip Coombes
///
// Modified August 31, 2013 by Anthony Cassandra for ARC console use
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

// We use this code in case we want to override live feed to come directly
// from an IP camera instead of relaying through zoneminder and loading 
// the server.
//
require_once "direct-streams.php";

if ( !canView( 'Stream' ) )
{
    $view = "error";
    return;
}

$sql = "select C.*, M.* from Monitors as M left join Controls as C on (M.ControlId = C.Id ) where M.Id = '".dbEscape($_REQUEST['mid'])."'";
$monitor = dbFetchOne( $sql );

if ( isset( $_REQUEST['scale'] ) )
    $scale = validInt($_REQUEST['scale']);
else
    $scale = reScale( SCALE_BASE, $monitor['DefaultScale'], ZM_WEB_DEFAULT_SCALE );

$connkey = generateConnKey();

if ( isset( $_REQUEST['videoWidth'] ))
  $maxWidth = $_REQUEST['videoWidth'];
else
  $maxWidth = $event['Width'];
if ( isset( $_REQUEST['videoHeight'] ))
  $maxHeight = $_REQUEST['videoHeight'];
else
  $maxHeight = $event['Height'];

// We might use a direct stream, in which case the ZoneMinder size def
// may not apply. This routine handles doing the right thing based on
// where it will stream from (ZM or Direct).
//
$monitorSize = ARC_getMonitorSize( $monitor['Id'], $monitor['Name'], 
                                   $monitor['Width'], $monitor['Height'] );

$streamSize = scaleImage( $monitorSize['width'],
                          $monitorSize['height'],
                          $maxWidth,
                          $maxHeight );

$streamWidth = $streamSize['width'];
$streamHeight = $streamSize['height'];

noCacheHeaders();

xhtmlHeaders( __FILE__, $monitor['Name']." - ".$SLANG['Feed'] );
?>
<body>
  <div id="page">
    <div id="content" class="arc-content">
      <div id="imageFeed">
<?php
          ARC_outputStreamHelper( $monitor['Id'], $monitor['Name'], 
                                  $streamWidth, $streamHeight,
                                  $scale );
?>
      </div>
    </div>
  </div>
</body>
</html>
