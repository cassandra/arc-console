<?php
//
// ZoneMinder (A)ctive (R)response (C)amera console view PHP file, $Date:
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

// NOTE:
//   See the corresponding js/arc-console.js file for the "Theory of
//   Operation" for this view.

//========================================
// Preliminary data processing
//========================================

if ( !canView( 'Stream' ) )
{
    $view = "error";
    return;
}

//--------------------
// Restoring client state from cookies

define('ARC_SIGNALS_STATE_COOKIE', 'zmARCSignals');
define('ARC_SOUNDS_STATE_COOKIE', 'zmARCSounds');

$signalsEnabled = "true";
if ( isset($_COOKIE[ARC_SIGNALS_STATE_COOKIE]) )
  $signalsEnabled = $_COOKIE[ARC_SIGNALS_STATE_COOKIE];

$soundsEnabled = "true";
if ( isset($_COOKIE[ARC_SOUNDS_STATE_COOKIE]) )
  $soundsEnabled = $_COOKIE[ARC_SOUNDS_STATE_COOKIE];

//--------------------
// For event listings

parseFilter( $_REQUEST['filter'] );
$filterQuery = $_REQUEST['filter']['query'];

// For live views of monitors
$running = daemonCheck();
$status = $running?$SLANG['Running']:$SLANG['Stopped'];

if ( $group = dbFetchOne( "select * from Groups where Id = '".(empty($_COOKIE['zmGroup'])?0:dbEscape($_COOKIE['zmGroup']))."'" ) )
    $groupIds = array_flip(explode( ',', $group['MonitorIds'] ));

$sqlQuery = "SELECT * FROM Monitors";
$sqlQuery .= " WHERE Function IN ( 'Modect', 'Monitor' ) AND Enabled";
$sqlQuery .= " ORDER BY Sequence ASC";

$monitors = dbFetchAll( $sqlQuery );
$displayMonitors = array();
$monitorIdList = array();
for ( $i = 0; $i < count($monitors); $i++ )
{
    if ( !visibleMonitor( $monitors[$i]['Id'] ) )
    {
        continue;
    }
    if ( $group && !empty($groupIds) && !array_key_exists( $monitors[$i]['Id'], $groupIds ) )
    {
        continue;
    }
    $monitors[$i]['Show'] = true;
    $monitors[$i]['zmc'] = zmcStatus( $monitors[$i] );
    $monitors[$i]['zma'] = zmaStatus( $monitors[$i] );
    $displayMonitors[] = $monitors[$i];
    array_push( $monitorIdList, $monitors[$i]['Id'] );
}

$firstMonitorId = null;
$numMonitors = count($displayMonitors);
if ( $numMonitors > 0 )
  $firstMonitorId = $displayMonitors[0]['Id'];

if ( $numMonitors < 1 ) {
  require_once "arc-no-monitors.php";
  return;
}

//========================================
// Beginning of page rendering
//========================================

noCacheHeaders();

xhtmlHeaders(__FILE__, $SLANG['ARCConsole'] );

?>

<body class="arc-body" onload="ARC_handlePageLoaded();">
 <div id="page" class="arc-page">
  <div id="content" class="arc-content">
    <div id="arc-live-pane">
      <div id="arc-live-controls" class="arc-button-container">

           <div class="arc-live-buttons">
             <div id="arc-live-button-ALL" class="arc-live-monitor-control arc-button" state="inactive" onclick="ARC_handleLiveNameClick( 'ALL' );" title="<?= $SLANG['TT-ViewLiveFeedAll'] ?>"><?= $SLANG['AllMonitors'] ?></div>
             <div id="arc-disable-ALL" class="arc-live-monitor-state arc-button" onclick="ARC_handleDisableClick('ALL');" title="<?= $SLANG['TT-DisableAll'] ?>"><?= $SLANG['DisableAll'] ?></div>
             <div id="arc-waiting-ALL" class="arc-waiting arc-waiting-ALL arc-hidden" ><?= $SLANG['Waiting'] ?></div>
          </div>

           <div class="arc-live-buttons">
             <div id="arc-live-button-CYCLE" class="arc-live-monitor-control arc-button" state="inactive" onclick="ARC_handleLiveCycleClick( );" title="<?= $SLANG['TT-ViewLiveCycleAll'] ?>"><?= $SLANG['CycleMonitors'] ?></div>
             <div id="arc-enable-ALL" class="arc-live-monitor-state arc-button" onclick="ARC_handleEnableClick('ALL');" title="<?= $SLANG['TT-EnableAll'] ?>"><?= $SLANG['EnableAll'] ?></div>
             <div id="arc-waiting-ALL" class="arc-waiting arc-waiting-ALL arc-hidden" ><?= $SLANG['Waiting'] ?></div>
          </div>

<?php
foreach( $displayMonitors as $monitor )
{
  $monitorId = $monitor['Id'];
  $buttonElemId = "arc-live-button-".$monitorId;
  $scale = max( reScale( SCALE_BASE, $monitor['DefaultScale'], ZM_WEB_DEFAULT_SCALE ), SCALE_BASE );
  $cycleGroup = isset($_COOKIE['zmGroup'])?$_COOKIE['zmGroup']:0;

?>
           <div class="arc-live-buttons">
             <div id="<?= $buttonElemId ?>" class="arc-live-monitor-control arc-button" state="inactive" onclick="ARC_handleLiveNameClick('<?= $monitorId ?>');" title="<?= $SLANG['TT-ViewLiveFeedFrom'].$monitor['Name'] ?>"><?= $monitor['Name'] ?></div>
<?php
  if ( canEdit('Monitors') ) {
?>
             <div id="arc-enabled-<?= $monitorId ?>" class="arc-live-monitor-state arc-button arc-hidden" state="active" onclick="ARC_handleDisableClick('<?= $monitorId ?>');" title="<?= $monitor['Name'].$SLANG['TT-MonitorEnabled'] ?>"><?= $SLANG['Enabled'] ?></div>
             <div id="arc-waiting-<?= $monitorId ?>" class="arc-waiting" ><?= $SLANG['Waiting'] ?></div>
             <div id="arc-disabled-<?= $monitorId ?>" class="arc-live-monitor-state arc-button arc-hidden" state="inactive" onclick="ARC_handleEnableClick('<?= $monitorId ?>');" title="<?= $monitor['Name'].$SLANG['TT-MonitorDisabled'] ?>"><?= $SLANG['Disabled'] ?></div>         
          </div>
<?php
  }
}
?>

        <div class="arc-clear"></div>
      </div>
      <div class="arc-live-video">
        <iframe id="arc-live-video-iframe" >
        </iframe>
      </div>
    </div>

    <div id="arc-event-pane">
      <div class="arc-event-links">
        <a href="?skin=classic" title="<?= $SLANG['TT-ClassicConsole'] ?>">
            <?= $SLANG['ClassicConsole'] ?>
        </a>
      </div>

      <div id="arc-event-controls" class="arc-button-container">
        <div class="arc-event-refresh arc-event-control arc-button"
               onclick="ARC_forceEventRefresh();" title="<?= $SLANG['TT-RefreshEvents'] ?>">
            <?= $SLANG['RefreshEvents'] ?>
        </div>
        <div id="arc-event-more" class="arc-event-more arc-event-control arc-button"
               onclick="ARC_showMoreEvents();"  title="<?= $SLANG['TT-ShowMoreEvents'] ?>">
            <?= $SLANG['MoreEvents'] ?>
        </div>
        <div id="arc-event-less" class="arc-event-more arc-event-control arc-button arc-hidden"
               onclick="ARC_showLessEvents();"  title="<?= $SLANG['TT-ShowLessEvents'] ?>">
            <?= $SLANG['LessEvents'] ?>
        </div>
        <div id="arc-turn-signals-off" class="arc-turn-signals-off arc-event-control arc-button <?= ($signalsEnabled == 'true') ? '' : 'arc-hidden' ?>" state="active"
               onclick="ARC_disableSignals();"  title="<?= $SLANG['TT-SignalsEnabled'] ?>">
            <?= $SLANG['SignalsOn'] ?>
        </div>
        <div id="arc-turn-signals-on" class="arc-turn-signals-on arc-event-control arc-button <?= ($signalsEnabled == 'true') ? 'arc-hidden' : '' ?>" state="inactive"
               onclick="ARC_enableSignals();"  title="<?= $SLANG['TT-SignalsDisabled'] ?>">
            <?= $SLANG['SignalsOff'] ?>
        </div>
<?php
if ( ZM_WEB_SOUND_ON_ALARM )
{
?>
        <div id="arc-turn-sound-off" class="arc-turn-sound-off arc-event-control arc-button <?= ($soundsEnabled == 'true') ? '' : 'arc-hidden' ?>" state="active"
               onclick="ARC_disableSound();"  title="<?= $SLANG['TT-SoundsEnabled'] ?>">
            <?= $SLANG['SoundsOn'] ?>
        </div>
        <div id="arc-turn-sound-on" class="arc-turn-sound-on arc-event-control arc-button <?= ($soundsEnabled == 'true') ? 'arc-hidden' : '' ?>" state="inactive"
               onclick="ARC_enableSound();"  title="<?= $SLANG['TT-SoundsDisabled'] ?>">
            <?= $SLANG['SoundsOff'] ?>
        </div>
<?php
}
?>
      </div>

      <div id="arc-event-list" class="arc-event-list">
        <iframe id="arc-event-list-iframe" ></iframe>
      </div>

      <div class="arc-event-video">
        <iframe id="arc-event-video-iframe" src="?view=arc-event-empty">
        </iframe>
      </div>

    </div>

    <div class="arc-clear"></div>
  </div>
 </div>

<?php
if ( ZM_WEB_SOUND_ON_ALARM )
{
    $soundSrc = ZM_DIR_SOUNDS.'/'.ZM_WEB_ALARM_SOUND;
?>
<!-- 
 Original zoneminder code uses this older embed tag or a windows-specific
 active-x thing. The newer 'audio' tag I use instead only works in HTML5,
 though different browsers support different types
 of audio files. See http://www.w3schools.com/tags/tag_audio.asp
-->
  <div id="alarmSound" class="arc-hidden">
    <audio id="arc-signal-audio"
           src="<?= $soundSrc ?>"
           autostart="true"
           loop="true"
           hidden="true">
    </audio>
  </div>
<?php
}
?>

<?php
if ( $ARC_DEBUG_PANE )
  require_once "arc-console-debug.php";
?>

</body>
</html>
