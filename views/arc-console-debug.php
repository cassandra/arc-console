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

echo "<script language=\"JavaScript1.2\">\n";
require_once "js/arc-console-debug.js";
echo "</script>\n";

echo "<style>\n";
require_once "css/arc-console-debug.css";
echo "</style>\n";
?>

<div id="arc-debug-pane">

  <div class="arc-debug-counters">
     <span id="arc-debug-status-count">0</span> 
     / <span id="arc-debug-latest-count">0</span>
  </div>

<?php
foreach( $displayMonitors as $monitor )
{
  $monitorId = $monitor['Id'];
?>
  <div class="arc-debug-section">
    <?= $monitor['Name'] ?>
    <div class="arc-debug-button"
         onclick="ARCDEBUG_handleForceAlarmClick( '<?= $monitorId ?>' );">
      Force Alarm
    </div>
    <div class="arc-debug-button"
         onclick="ARCDEBUG_handleCancelForceAlarmClick( '<?= $monitorId ?>' );">
      Cancel Forced
    </div>
    <div class="arc-debug-button"
         onclick="ARC_signalMonitorButtons( [ '<?= $monitorId ?>' ] );">
      Set Signal
    </div>

  </div>
<?php
}
?>
  <div class="arc-debug-section arc-debug-all-controls">
    All Monitors
      <div class="arc-debug-button"
           onclick="ARC_clearMonitorButtons();">
        Clear Signals
      </div>
  </div>

  <div class="arc-debug-section arc-debug-all-controls">
    Signals
      <div class="arc-debug-button"
           onclick="ARCDEBUG_forceVisualWarningSignal();">
        Visual Warning
      </div>
      <div class="arc-debug-button"
           onclick="ARCDEBUG_forceVisualCriticalSignal();">
        Visual Critical
      </div>
      <div class="arc-debug-button"
           onclick="ARCDEBUG_stopVisualSignal();">
        Stop Signal
      </div>
      <div class="arc-debug-button"
           onclick="ARC_startAudibleSignal();">
        Audible Signal
      </div>
      <div class="arc-debug-button"
           onclick="ARC_stopAudibleSignal();">
        Stop Audible
      </div>
  </div>

  <div class="arc-clear"></div>

</div>
