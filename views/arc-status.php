<?php
//========================================
// This is used for the AJAX call to get the monitor(s) status, which
// is returned as a JSON structure.
//========================================
//
// ZoneMinder (A)ctive (R)response (C)amera status view PHP file, $Date:
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

if ( !canView( 'System' ) )
{
    $view = "error";
    return;
}

$zmuCommand = getZmuCommand( " --list" );
$result = exec( escapeshellcmd( $zmuCommand ), $output );

$colNames = array();
if ( $row = array_shift( $output ) )
{
    foreach ( preg_split( "/\s+/", $row ) as $col )
    {
      array_push( $colNames, $col );
    }
}

if ( count($colNames) < 1 ) {
    $view = "error";
    return;
}

$statusList = array();

foreach ( $output as $row )
  {
    $statusItem = array();
    $idx = 0;
    foreach ( preg_split( "/\s+/", $row ) as $col )
      {
        $key = $colNames[$idx];
        if ( ! empty($key) )
          $statusItem[$key] = $col;
        $idx += 1;
      }
    array_push( $statusList, $statusItem );
}

noCacheHeaders();
header('Content-type: application/json');
header('Access-Control-Allow-Origin: http://bordeaux-dev.localhost');

echo json_encode( $statusList );


?>
