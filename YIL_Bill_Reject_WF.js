/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * 
 */

define(["N/redirect"], function(redirect) {

    function onAction(context) {

        var billRecObj = context.newRecord;
        var billId = billRecObj.id;
        
        log.debug({title: "Reject Bill ID", details: billId});
        
        var params = {processFlag: "br", bid: billId, fromrec: "1"};
        redirect.toSuitelet({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', parameters: params});


    }

    return {
        onAction: onAction
    }

 });