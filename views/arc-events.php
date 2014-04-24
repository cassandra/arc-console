<?php
//
// ZoneMinder (A)ctive (R)response (C)amera events view PHP file, $Date:
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
// Preliminary data fetching and logic
//========================================

if ( !canView( 'Events' ) || (!empty($_REQUEST['execute']) && !canEdit('Events')) )
{
    $view = "error";
    return;
}

$eventsSql = "select E.Id,E.MonitorId,M.Name As MonitorName,E.Name,E.Cause,E.Notes,E.StartTime,E.EndTime,E.Length,E.Frames,E.AlarmFrames,E.TotScore,E.AvgScore,E.MaxScore,E.Archived,E.Emailed,E.Messaged from Monitors as M inner join Events as E on (M.Id = E.MonitorId)";

$eventsSql .= " WHERE E.EndTime IS NOT NULL";

if ( $user['MonitorIds'] )
{
    $eventsSql .= " AND M.Id in (".join( ",", preg_split( '/["\'\s]*,["\'\s]*/', $user['MonitorIds'] ) ).")";
}

$eventsSql .= " ORDER BY E.Id DESC LIMIT 10";

$activeEventId = "";
if ( isset($_REQUEST['activeEventId']) )
  $activeEventId = $_REQUEST['activeEventId'];

$events = array();
foreach ( dbFetchAll( $eventsSql ) as $event )
{
    $events[] = $event;
}

//========================================
// Beginning of page rendering
//========================================

xhtmlHeaders(__FILE__, $SLANG['Events'] );

?>

<body class="arc-body" onload="ARC_handleEventListPageLoaded('<?= $activeEventId ?>');">
  <div id="page">
    <div id="content" class="arc-content" title="<?= $SLANG['TT-PlayEvent'] ?>" >
        <table id="contentTable" class="arc-event-table" cellspacing="0">
          <tbody>
            <tr>
              <th class="colId"><?= $SLANG['Id'] ?></th>
              <th class="colMonitor"><?= $SLANG['Monitor'] ?></th>
              <th class="colTime"><?= $SLANG['Time'] ?></th>
              <th class="colDuration"><?= $SLANG['Duration'] ?></th>
              <th class="colFrames"><?= $SLANG['Frames'] ?></th>
              <th class="colAlarmFrames"><?= $SLANG['AlarmBrFrames'] ?></th>
              <th class="colTotScore"><?= $SLANG['TotalBrScore'] ?></th>
            </tr>

<?php

foreach ( $events as $event )
  {
  $eventId = $event['Id'].($event['Archived']?'*':'');
  $rowElemId = "arc-event-row-".$eventId;

  if ( $event['Emailed'] || $event['Messaged'] )
    $extraClass = "arc-event-row-critical";
  else
    $extraClass = "";
?>
            <tr id="<?= $rowElemId ?>"
                class="arc-event-row <?= $extraClass ?>" 
                onclick="ARC_handleEventRowClick( '<?= $eventId ?>' );">
              <td class="colId"><?= $eventId ?></td>
              <td class="colMonitorName"><?= $event['MonitorName'] ?></td>
              <td class="colTime"><?= strftime( STRF_FMT_DATETIME_SHORTER, strtotime($event['StartTime']) ) ?></td>
              <td class="colDuration colNumber"><?= $event['Length'] ?></td>
              <td class="colFrames colNumber"><?= $event['Frames'] ?></td>
              <td class="colAlarmFrames colNumber"><?= $event['AlarmFrames'] ?></td>
              <td class="colTotScore colNumber"><?= $event['TotScore'] ?></td>
            </tr>

<?php
}
// Handle case if no events exist
if ( count($events) < 1 ) {
?>
            <tr class="arc-event-row">
              <td class="arc-no-events" colspan="7">
                <?= $SLANG['NoEventsFound'] ?>
              </td>
            </tr>
<?php
}
?>

          </tbody>
        </table>

    </div>
  </div>

</body>
</html>
