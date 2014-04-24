// ZoneMinder (A)ctive (R)response (C)amera console view JS/PHP file,
// $Date: 2013-08-30 19:52:12 +0000 (Fri, 30 Aug 2013) $, $Revision: 1 $
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

var ZM_WEB_SOUND_ON_ALARM = <?= ZM_WEB_SOUND_ON_ALARM ?>;

var ARC_WAITING_TEXT = '<?= $SLANG['Waiting'] ?>';
var ARC_ALARM_TEXT = '<?= $SLANG['ARCAlarm'] ?>';
var ARC_ALERT_TEXT = '<?= $SLANG['ARCAlert'] ?>';

var ARC_canEditMonitors = <?= canEdit( 'Monitors' )?'true':'false' ?>;

var ARC_SIGNALS_STATE_COOKIE = '<?= ARC_SIGNALS_STATE_COOKIE ?>';
var ARC_SOUNDS_STATE_COOKIE = '<?= ARC_SOUNDS_STATE_COOKIE ?>';

var ARC_SignalsEnabled = <?= $signalsEnabled ?>;
var ARC_SoundsEnabled = <?= $soundsEnabled ?>;

var ARC_MonitorIdList = [
<?php
foreach( $displayMonitors as $monitor ) { 
  echo '"'.$monitor['Id'].'",'; 
}
?>
                     ];
