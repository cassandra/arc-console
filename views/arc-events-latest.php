<?php
//========================================
// This is used for the AJAX call to get the list of the latest events, which
// is returned as a JSON structure.
//========================================
//
// ZoneMinder (A)ctive (R)response (C)amera latest events view PHP file,
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

$eventsSql = "select E.Id,E.MonitorId,M.Name As MonitorName,E.Name,E.Cause,E.Notes,E.StartTime,E.EndTime,E.Length,E.Frames,E.AlarmFrames,E.TotScore,E.AvgScore,E.MaxScore,E.Archived,E.Emailed,E.Messaged from Monitors as M inner join Events as E on (M.Id = E.MonitorId)";

$eventsSql .= " WHERE E.EndTime IS NOT NULL";
$eventsSql .= " ORDER BY E.Id DESC LIMIT 10";

$latestEventList = array();
foreach ( dbFetchAll( $eventsSql ) as $event )
{
    $latestEventList[] = $event;
}

noCacheHeaders();
header('Content-type: application/json');
header('Access-Control-Allow-Origin: http://bordeaux-dev.localhost');

echo json_encode( $latestEventList );

?>
