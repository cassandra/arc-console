//========================================
// Periodic Updates of internal state
//========================================

//--------------------    
function ARCDEBUG_update() {
    $("arc-debug-status-count").set('text', "S="+ARC_MonitorQueryCounter );
    $("arc-debug-latest-count").set('text', "L="+ARC_LatestEventsCounter );
}

ARCDEBUG_update.periodical(1000);

//========================================
// Forced alarms
//========================================

//--------------------
function ARCDEBUG_handleForceAlarmClick( monitorId ) {
    ARC_sendAlarmRequest( monitorId, "forceAlarm" );
}

//--------------------
function ARCDEBUG_handleCancelForceAlarmClick( monitorId ) {
    ARC_sendAlarmRequest( monitorId, "cancelForcedAlarm" );
}

//========================================
// Forced signals
//========================================

//--------------------
function ARCDEBUG_forceVisualWarningSignal() {
    ARC_CurrentSignalState = ARC_SIGNAL_WARNING;
    ARC_startVisualSignal();
}

//--------------------
function ARCDEBUG_forceVisualCriticalSignal() {
    ARC_CurrentSignalState = ARC_SIGNAL_CRITICAL;
    ARC_startVisualSignal();
}

//--------------------
function ARCDEBUG_stopVisualSignal() {
    ARC_CurrentSignalState = ARC_SIGNAL_NONE;
    ARC_stopVisualSignal();
}