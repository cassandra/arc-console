//
// Import constants
//
var connKey = '<?= $connkey ?>';

var monitorId = <?= $monitor['Id'] ?>;
var monitorWidth = <?= $monitor['Width'] ?>;
var monitorHeight = <?= $monitor['Height'] ?>;

var scale = <?= $scale ?>;

var canEditMonitors = <?= canEdit( 'Monitors' )?'true':'false' ?>;
