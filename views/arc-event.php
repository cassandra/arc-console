<?php
//
// ZoneMinder (A)ctive (R)response (C)amera event view PHP file, $Date:
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
if ( !canView( 'Events' ) )
{
    $view = "error";
    return;
}

if ( ! isset( $_REQUEST['eid'] ))
{
  $view = "error";
  return;
}

$eid = validInt( $_REQUEST['eid'] );
$fid = !empty($_REQUEST['fid'])?validInt($_REQUEST['fid']):1;

if ( $user['MonitorIds'] )
    $midSql = " and MonitorId in (".join( ",", preg_split( '/["\'\s]*,["\'\s]*/', dbEscape($user['MonitorIds']) ) ).")";
else
    $midSql = '';

$sql = "select E.*,M.Name as MonitorName,M.Width,M.Height,M.DefaultRate,M.DefaultScale from Events as E inner join Monitors as M on E.MonitorId = M.Id where E.Id = '".dbEscape($eid)."'".$midSql;
$event = dbFetchOne( $sql );

if ( isset( $_REQUEST['rate'] ) )
    $rate = validInt($_REQUEST['rate']);
else
    $rate = reScale( RATE_BASE, $event['DefaultRate'], ZM_WEB_DEFAULT_RATE );
if ( isset( $_REQUEST['scale'] ) )
    $scale = validInt($_REQUEST['scale']);
else
    $scale = reScale( SCALE_BASE, $event['DefaultScale'], ZM_WEB_DEFAULT_SCALE );

$replayModes = array(
    'single' => $SLANG['ReplaySingle'],
    'all' => $SLANG['ReplayAll'],
    'gapless' => $SLANG['ReplayGapless'],
);

if ( isset( $_REQUEST['streamMode'] ) )
    $streamMode = validHtmlStr($_REQUEST['streamMode']);
else
    $streamMode = canStream()?'stream':'stills';

if ( isset( $_REQUEST['replayMode'] ) )
    $replayMode = validHtmlStr($_REQUEST['replayMode']);
if ( isset( $_COOKIE['replayMode']) && preg_match('#^[a-z]+$#', $_COOKIE['replayMode']) )
    $replayMode = validHtmlStr($_COOKIE['replayMode']);
 else
     $replayMode = array_shift( array_keys( $replayModes ) );

parseSort();
parseFilter( $_REQUEST['filter'] );
$filterQuery = $_REQUEST['filter']['query'];

if ( isset( $_REQUEST['videoWidth'] ))
  $maxWidth = $_REQUEST['videoWidth'];
else
  $maxWidth = $event['Width'];
if ( isset( $_REQUEST['videoHeight'] ))
  $maxHeight = $_REQUEST['videoHeight'];
else
  $maxHeight = $event['Height'];

$streamSize = scaleImage( $event['Width'], $event['Height'],
                          $maxWidth, $maxHeight );

$streamWidth = $streamSize['width'];
$streamHeight = $streamSize['height'];

$connkey = generateConnKey();

$focusWindow = true;

xhtmlHeaders(__FILE__, $SLANG['ARCEvent'] );
?>
<body>
  <div id="page">
    <div id="content" class="arc-content">
      <div id="eventStream" onclick="ARC_handleEventVideoClicked();"
           title="<?= $SLANG['TT-ReplayEvent'] ?>" >
        <div id="imageFeed">
<?php
if ( ZM_WEB_STREAM_METHOD == 'mpeg' && ZM_MPEG_LIVE_FORMAT )
{
    $streamSrc = getStreamSrc( array( "source=event", "mode=mpeg", "event=".$eid, "frame=".$fid, "scale=".$scale, "rate=".$rate, "bitrate=".ZM_WEB_VIDEO_BITRATE, "maxfps=".ZM_WEB_VIDEO_MAXFPS, "format=".ZM_MPEG_REPLAY_FORMAT, "replay=".$replayMode ) );
    outputVideoStream( "evtStream", $streamSrc, $streamWidth, $streamHeight, ZM_MPEG_LIVE_FORMAT );
}
else
{
    $streamSrc = getStreamSrc( array( "source=event", "mode=jpeg", "event=".$eid, "frame=".$fid, "scale=".$scale, "rate=".$rate, "maxfps=".ZM_WEB_VIDEO_MAXFPS, "replay=".$replayMode) );

    // Note that original ZM code assumes Google Chrome browser cannot
    // stream.  I found that current versions are able to do this, and also
    // ran into trouble falling back to the java applet (camboloza) version.
    // So I override for chrome here.

    if ( isChrome() || canStreamNative() )
    {
        outputImageStream( "evtStream", $streamSrc, $streamWidth, $streamHeight, validHtmlStr($event['Name']) );
    }
    else
    {
        outputHelperStream( "evtStream", $streamSrc, $streamWidth, $streamHeight );
    }
}

?>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
