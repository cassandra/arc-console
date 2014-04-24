<?php
//
// ZoneMinder (A)ctive (R)response (C)amera montage view PHP file, $Date:
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

if ( $user['MonitorIds'] )
    $midSql = " and Id in (".join( ",", preg_split( '/["\'\s]*,["\'\s]*/', dbEscape($user['MonitorIds']) ) ).")";
else
    $midSql = '';

$sql = "select * from Monitors where Function != 'None' $midSql order by Sequence";

$maxWidth = 0;
$maxHeight = 0;
$showControl = false;
$index = 0;
$monitorCount = 0;
$monitors = array();
foreach( dbFetchAll( $sql ) as $row )
{
    if ( !visibleMonitor( $row['Id'] ) )
    {
        continue;
    }
    if ( isset( $_REQUEST['scale'] ) )
        $scale = validInt($_REQUEST['scale']);
    else
        $scale = reScale( SCALE_BASE, $row['DefaultScale'], ZM_WEB_DEFAULT_SCALE );

    $row['index'] = $index++;
    $monitors[] = $row;
    $monitorCount += 1;
}

if ( isset( $_REQUEST['videoWidth'] ))
  $frameWidth = $_REQUEST['videoWidth'];
else
  $frameWidth = 1000;
if ( isset( $_REQUEST['videoHeight'] ))
  $frameHeight = $_REQUEST['videoHeight'];
else
  $frameHeight = 800;

// Compute the size of the video stream from the number of monitors
//
$numCols = ceil( sqrt( $monitorCount ));
$numRows = ceil( $monitorCount / $numCols );

// Some extra slack for 1px border
$MARGIN = 2;

$containerWidth = floor($frameWidth / $numCols) - 2 * $MARGIN * $numCols;
$containerHeight = floor($frameHeight / $numRows) - 2 * $MARGIN * $numRows;

$focusWindow = true;

xhtmlHeaders(__FILE__, $SLANG['ARCMontage'] );
?>
<body>
  <div id="page">
    <div id="content" class="arc-content">
      <div id="monitors">
       <div class="arc-montage-row">
<?php
$curRow = 0;
$curCol = 0;
foreach ( $monitors as $monitor )
{
    // We might use a direct stream, in which case the ZoneMinder size def
    // may not apply. This routine handles doing the right thing based on
    // where it will stream from (ZM or Direct).
    //
    $monitorSize = ARC_getMonitorSize( $monitor['Id'], $monitor['Name'], 
                                       $monitor['Width'], $monitor['Height'] );

    $streamSize = scaleImage( $monitorSize['width'],
                              $monitorSize['height'],
                              $containerWidth,
                              $containerHeight );
    
    $streamWidth = $streamSize['width'];
    $streamHeight = $streamSize['height'];

    $paddingVertical = floor( ( $containerHeight - $streamHeight) / 2.0);
    $paddingHorizontal = floor( ( $containerWidth - $streamWidth ) / 2.0);

    if ( $curCol >= $numCols ) {
      echo "        <div class=\"arc-clear\"></div>\n";
      echo "       </div>\n";
      echo "       <div class=\"arc-montage-row\">\n";
      $curRow += 1;
      $curCol = 0;
    }
    else {
      $curCol += 1;
    }

    if ( !isset( $scale ) )
        $scale = reScale( SCALE_BASE, $monitor['DefaultScale'], ZM_WEB_DEFAULT_SCALE );
?>
       <div class="arc-montage-col" style="width: <?= $streamWidth ?>px; height: <?= $streamHeight ?>px; padding: <?= $paddingVertical ?>px <?= $paddingHorizontal ?>px <?= $paddingVertical ?>px <?= $paddingHorizontal ?>px;" >
        <div id="arc-message-<?= $monitor['Id'] ?>" class="arc-message arc-hidden">&nbsp;</div>
        <div id="monitorFrame<?= $monitor['index'] ?>" class="monitorFrame">
          <div id="monitor<?= $monitor['index'] ?>" class="monitor idle">
            <div id="imageFeed<?= $monitor['index'] ?>" class="imageFeed" onclick="ARC_handleLiveStreamClick('<?= $monitor['Id'] ?>');" title="<?= $SLANG['MontageTooltipPrefix'].$monitor['Name'].$SLANG['MontageTooltipMiddle'].$monitor['Id'].$SLANG['MontageTooltipSuffix'] ?>">
<?php
          ARC_outputStreamHelper( $monitor['Id'], $monitor['Name'], 
                                  $streamWidth, $streamHeight,
                                  $scale );
?>
             </div>
            </div>
          </div>
        </div>
<?php
}
?>
        <div class="arc-clear"></div>
       </div>
      </div>
    </div>
  </div>
</body>
</html>
