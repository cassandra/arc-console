<?php
//
// ZoneMinder (A)ctive (R)response (C)amera special direct stream file PHP
// file, $Date:
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

//--------------------
// NOTE:
//
// The purpose of this file is to provide configuration information to
// allow the live camera feeds to come directly from the camera in the
// case of having IP cameras.  By going through ZoneMinder to stream, you
// are taking an indirect path and putting load on the server, so better
// to go straight ot the source.  It is also true for some camera that the
// output you might want to use for ZoneMInder, might be different from
// what you might like to view as a live feed.
//
// This information would better be stored in a database or some other
// adjustable storage, but for now this is sort of a hidden feature I
// used for my own purpose, but wanted to do it in a way that I documented
// so others could leverage it without too much burden.  If this becomes
// more braodly useful, I will figure out a better design for managing 
// this data.
//--------------------

//--------------------
// This is the place to put "host-specific" definitions so they work for
// you, but unlikely to interfere with others.

// You can specify the direct streaming parameters by the monitor Id or its
// name (or both) by just setting this hash to have the definition values.
// The code will first check for a matching id and then a name and then 
// fall back to delivering stream from ZoneMinder. Ideally, this would be a
// new field in the Monitors database.
//
// There's a double hash structure $DIRECT_STREAM_PARAMS which is keyed on:
//
//    1) Domain name or IP address as found in: $_SERVER['SERVER_ADDR'] 
//       $_SERVER['SERVER_NAME']
//    2) Monitor Id or Monitor Name as defined in ZoneMInder
//
// Each item in these hashes should itself be a hash with the following
// params:
//
//  'uri' - The direct stream URI to use 
//          (required)
//
//  'width' - The width (in pixels) of the direct stream.
//             (optional, zoneminder defs used if omitted)
//
//  'height' - The height (in pixels) of the direct stream.
//             (optional, zoneminder defs used if omitted)
//
//  'rotation' - One of these values: none, 90, -90, 180.
//               (optional, default=none)
//
// NOTE: The width and height are of the stream before any rotation.
//       Thus, if you define a 1280x800 height stream to rotate 90 degrees,
//       the effective dimensions are 800x1280 for the purposes of scaling
//       to fit the window.

$DIRECT_STREAM_PARAMS = array();

//--------------------
// cassandra.org

$cdoFront = array( "uri" => "http://192.168.100.201/video4.mjpg",
                   "width" => "1280",
                   "height" => "800",
                   "rotation" => "90" );
$cdoSide = array( "uri" => "http://192.168.100.202/video.mjpg",
                   "width" => "640",
                   "height" => "480",
                  "rotation" => "none" );
$cdoBack = array( "uri" => "http://192.168.100.203/video.mjpg",
                   "width" => "640",
                   "height" => "480",
                   "rotation" => "none" );
$cdoHigh = array( "uri" => "http://192.168.100.204/video3.mjpg",
                  "width" => "1280",
                  "height" => "800",
                  "rotation" => "none" );

// Dev
$DIRECT_STREAM_PARAMS['groovy'] = array();
$DIRECT_STREAM_PARAMS['groovy']['FrontCamera'] = $cdoFront;
$DIRECT_STREAM_PARAMS['groovy']['SideCamera'] = $cdoSide;
$DIRECT_STREAM_PARAMS['groovy']['BackCamera'] = $cdoBack;
$DIRECT_STREAM_PARAMS['groovy']['HighCamera'] = $cdoHigh;

// Production
$DIRECT_STREAM_PARAMS['bordeaux'] = array();
$DIRECT_STREAM_PARAMS['bordeaux']['FrontCamera'] = $cdoFront;
$DIRECT_STREAM_PARAMS['bordeaux']['SideCamera'] = $cdoSide;
$DIRECT_STREAM_PARAMS['bordeaux']['BackCamera'] = $cdoBack;
$DIRECT_STREAM_PARAMS['bordeaux']['HighCamera'] = $cdoHigh;

$DIRECT_STREAM_PARAMS['192.168.100.2'] = array();
$DIRECT_STREAM_PARAMS['192.168.100.2']['FrontCamera'] = $cdoFront;
$DIRECT_STREAM_PARAMS['192.168.100.2']['SideCamera'] = $cdoSide;
$DIRECT_STREAM_PARAMS['192.168.100.2']['BackCamera'] = $cdoBack;
$DIRECT_STREAM_PARAMS['192.168.100.2']['HighCamera'] = $cdoHigh;

//--------------------
function ARC_getDirectStreamParams( $monitorId, $monitorName ) {
  global $DIRECT_STREAM_PARAMS;
  global $ARC_DIRECT_STREAMS_ALLOWED;

  if ( ! $ARC_DIRECT_STREAMS_ALLOWED )
    return null;

  $serverIp = $_SERVER['SERVER_ADDR'];
  $serverName = $_SERVER['SERVER_NAME'];

  $serverParams = null;
  if ( array_key_exists( $serverIp, $DIRECT_STREAM_PARAMS ))
    $serverParams = $DIRECT_STREAM_PARAMS[$serverIp];
  else if ( array_key_exists( $serverName, $DIRECT_STREAM_PARAMS ))
    $serverParams = $DIRECT_STREAM_PARAMS[$serverName];
  else
    return null;

  $directStreamParams = null;
  if ( array_key_exists( $monitorId, $serverParams ))
    $directStreamParams = $serverParams[$monitorId];
  else if ( array_key_exists( $monitorName, $serverParams ))
    $directStreamParams = $serverParams[$monitorName];
  else
    return null;

  return $directStreamParams;

}

//--------------------
function ARC_getMonitorSize( $monitorId, $monitorName, 
                             $zmMonitorWidth, $zmMonitorHeight ) {

  $monitorSize =  array( "width" => $zmMonitorWidth,
                         "height" => $zmMonitorHeight );

  $directStreamParams = ARC_getDirectStreamParams( $monitorId, $monitorName );

  if ( $directStreamParams == null )
    return $monitorSize;

  if ( array_key_exists( "width", $directStreamParams ))
    $monitorSize['width'] = $directStreamParams['width'];

  if ( array_key_exists( "height", $directStreamParams ))
    $monitorSize['height'] = $directStreamParams['height'];

  $swapDimensions = false;

  if ( array_key_exists( "rotation", $directStreamParams )) {
    if ( $directStreamParams['rotation'] == "90" )
      $swapDimensions = true;
    if ( $directStreamParams['rotation'] == "-90" )
      $swapDimensions = true;

    if ( $swapDimensions ) {
      $tmp = $monitorSize['height'];
      $monitorSize['height'] = $monitorSize['width'];
      $monitorSize['width'] = $tmp;
    }
  }

  return $monitorSize;
}

//--------------------
function ARC_outputStreamHelper( $monitorId, $monitorName, 
                                 $streamWidth, $streamHeight,
                                 $scale ) {

  $directStreamParams = ARC_getDirectStreamParams( $monitorId, $monitorName );

  if ( $directStreamParams == null )
    ARC_outputStreamFromZoneminder( $monitorId, $monitorName,
                                    $streamWidth, $streamHeight,
                                    $scale );
  else
    ARC_outputStreamFromDirect( $directStreamParams, 
                                $monitorId, $monitorName, 
                                $streamWidth, $streamHeight,
                                $scale );

}

//--------------------
function ARC_outputStreamFromDirect( $directStreamParams, 
                                     $monitorId, $monitorName,
                                     $streamWidth, $streamHeight,
                                     $scale ) {

  $classes = array( "arc-direct-stream" );
  
  if ( ! array_key_exists( "uri", $directStreamParams )) {
    echo '<div class="arc-direct-error">'.$SLANG['DirectFeedErrorUri'].'</div>';
    return;
  }

  $uri = $directStreamParams['uri'];
  
  if ( array_key_exists( "rotation", $directStreamParams )) {
    if ( $directStreamParams['rotation'] == "90" )
      array_push( $classes, "arc-rotate-pos-90" );
    if ( $directStreamParams['rotation'] == "-90" )
      array_push( $classes, "arc-rotate-neg-90" );
    if ( $directStreamParams['rotation'] == "180" )
        array_push( $classes, "arc-rotate-180" );
  }
  
  $swapDimensions = false;

  if ( array_key_exists( "rotation", $directStreamParams )) {
    if ( $directStreamParams['rotation'] == "90" )
      $swapDimensions = true;
    if ( $directStreamParams['rotation'] == "-90" )
      $swapDimensions = true;

    if ( $swapDimensions ) {
      $tmp = $streamHeight;
      $streamHeight = $streamWidth;
      $streamWidth = $tmp;
    }
  }

  $class = implode( " ", $classes );
  echo "<img id=\"arc-live-stream-$monitorId\" class=\"$class\" src=\"$uri\" width=\"$streamWidth\" height=\"$streamHeight\" alt=\"$monitorName\" />\n";
    
}

//--------------------
function ARC_outputStreamFromZoneminder( $monitorId, $monitorName, 
                                         $streamWidth, $streamHeight,
                                         $scale ) {
  if ( ZM_WEB_STREAM_METHOD == 'mpeg' && ZM_MPEG_LIVE_FORMAT )
    {
      $streamSrc = getStreamSrc( array( "mode=mpeg", "monitor=".$monitorId, "scale=".$scale, "bitrate=".ZM_WEB_VIDEO_BITRATE, "maxfps=".ZM_WEB_VIDEO_MAXFPS, "format=".ZM_MPEG_LIVE_FORMAT ) );
      outputVideoStream( "liveStream".$monitorId, $streamSrc, $streamWidth, $streamHeight, ZM_MPEG_LIVE_FORMAT );
    }
  else
    {
      $streamSrc = getStreamSrc( array( "mode=jpeg", "monitor=".$monitorId, "scale=".$scale, "maxfps=".ZM_WEB_VIDEO_MAXFPS ) );
      if ( isChrome() || canStreamNative() )
        {
          outputImageStream( "liveStream".$monitorId, $streamSrc, $streamWidth, $streamHeight, validHtmlStr($monitorName) );
        }
      else
        {
          outputHelperStream( "liveStream".$monitorId, $streamSrc, $streamWidth, $streamHeight );
        }
    }

}

?>
