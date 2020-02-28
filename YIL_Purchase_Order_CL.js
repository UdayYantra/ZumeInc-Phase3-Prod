/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * 
 */

define(['N/record', 'N/search', 'N/url', 'N/https', 'N/runtime'], function(record, search, url, https, runtime) {

    function pageInit(context) {
        //alert(context.mode);
        if(context.mode == "copy") {
            context.currentRecord.setValue({fieldId: 'custbody_pr_approval_flow', value: ''});
            context.currentRecord.setValue({fieldId: 'custbody_pr_approval_status', value: ''});
            context.currentRecord.setValue({fieldId: 'custbody_rejection_justifctn', value: ''});
            context.currentRecord.setValue({fieldId: 'custbody_cancellation_reason', value: ''});
        }
    }

    function lineInit(context) {
        
        //Bring Body Level Department and Class to Line Level Department and Class.
        var currentRecObj   = context.currentRecord;
        var type            = context.sublistId;

        var bdDepartment    = currentRecObj.getValue({fieldId: 'department'});
        var bdClass         = currentRecObj.getValue({fieldId: 'class'});
        var internalId      = currentRecObj.id;
        var prApprovalFlowRec = currentRecObj.getValue({fieldId: 'custbody_pr_approval_flow'});

        if(!prApprovalFlowRec && (type == 'item' || type == 'expense')) {
            
            if(!currentRecObj.getCurrentSublistValue({sublistId: type, fieldId: 'department'}) && bdDepartment != null) {
                currentRecObj.setCurrentSublistValue({sublistId: type, fieldId: 'department', value: bdDepartment});
            }
            if(!currentRecObj.getCurrentSublistValue({sublistId: type, fieldId: 'class'}) && bdClass != null) {
                currentRecObj.setCurrentSublistValue({sublistId: type, fieldId: 'class', value: bdClass});
            }   
        }
    }

    function postSourcing(context) {

        var currentRecObj   = context.currentRecord;
        var bdDepartmentId  = currentRecObj.getValue({fieldId: 'department'});
        var bdClassId       = currentRecObj.getValue({fieldId: 'class'});
        var internalId      = currentRecObj.id;
        var prApprovalFlowRec = currentRecObj.getValue({fieldId: 'custbody_pr_approval_flow'});
        
        //console.log('In Post Sourcing  =>  '+context.sublistId+' & '+context.fieldId);

        if(!prApprovalFlowRec) {
            if(context.sublistId == "item" && context.fieldId == "item") {
                
                //console.log('Found Here -> '+bdDepartmentId+" & "+bdClassId);
                if(bdDepartmentId) { currentRecObj.setCurrentSublistValue({sublistId: 'item', fieldId: 'department', value: bdDepartmentId}); }
                if(bdClassId) { currentRecObj.setCurrentSublistValue({sublistId: 'item', fieldId: 'class', value: bdClassId}); }
            }
            if(context.sublistId == "expense" && context.fieldId == "account") {
                
                //console.log('Found Here -> '+bdDepartmentId+" & "+bdClassId);
                if(bdDepartmentId) { currentRecObj.setCurrentSublistValue({sublistId: 'expense', fieldId: 'account', value: bdDepartmentId}); }
                if(bdClassId) { currentRecObj.setCurrentSublistValue({sublistId: 'expense', fieldId: 'account', value: bdClassId}); }
            }
        }

    }

    function fieldChanged(context) {
        //On requestor Selection, Populate the Department and Class of requestor.
        var currentRecObj   = context.currentRecord;
        var internalId      = currentRecObj.id;
       
        //console.log(context.fieldId);
        
        if(context.fieldId = "custbody_requestor") {
            var requestorId    = currentRecObj.getValue({fieldId: context.fieldId});
            var prApprovalFlowRec = currentRecObj.getValue({fieldId: 'custbody_pr_approval_flow'});
            if(!prApprovalFlowRec) {
            
                if(requestorId) {
                
                    var params = {processFlag: 'p', reqid: requestorId};
                    var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', params: params});
                    var response = https.get({url: suiteUrl});
                    //console.log(JSON.stringify(response));
                    var fullText = response.body;
                    //console.log('fullText -> '+ fullText);
                    if(fullText) {
                        
                        var fullTextArr = fullText.split(",");
                        var empDepartmentId = fullTextArr[0];
                        var empClassId = fullTextArr[1];
                        
                        if(empDepartmentId) { currentRecObj.setValue({fieldId: 'department', value:empDepartmentId, ignoreFieldChange: true}); }
                        if(empClassId) { currentRecObj.setValue({fieldId: 'class', value:empClassId, ignoreFieldChange: true}); }
    
                    }
    
                }

            }
            
        }

        

    }

    function validateLine(context) {

        if(context.sublistId == "item" || context.sublistId == "expense") {

            var currentRecObj = context.currentRecord;

            var bdDepartmentId = currentRecObj.getValue({fieldId: 'department'});
            var bdClassId = currentRecObj.getValue({fieldId:'class'});
            //console.log('Ln Department -> '+currentRecObj.getCurrentSublistValue({sublistId: context.sublistId, fieldId: 'department'}));
            //console.log('Ln Class -> '+currentRecObj.getCurrentSublistValue({sublistId: context.sublistId, fieldId: 'class'}));
            if(!currentRecObj.getCurrentSublistValue({sublistId: context.sublistId, fieldId: 'department'}) && bdDepartmentId != null) {
                currentRecObj.setCurrentSublistValue({sublistId: context.sublistId, fieldId: 'department', value: bdDepartmentId});
            }
            if(!currentRecObj.getCurrentSublistValue({sublistId: context.sublistId, fieldId: 'class'}) && bdClassId != null) {
                currentRecObj.setCurrentSublistValue({sublistId: context.sublistId, fieldId: 'class', value: bdClassId});
            }  
        }

        return true;
    }


    function submitApprovalFun(recId) {
        //alert('Reached Here...'+recId);

        var scriptObj = runtime.getCurrentScript();

        if(recId != null) {
            var prRecId
            var errorEncountered    = false;
            var errorMessage        = '';
            var fpaApproverId       = '';
            var hocApproverId       = '';
            var buApproversArr      = [];
            var fpaThresholdAmt     = 0.00;
            var hocThresholdAmt     = 0.00;

            fpaThresholdAmt = scriptObj.getParameter({name: 'custscript_fpa_threshold_amt'});
            hocThresholdAmt = scriptObj.getParameter({name: 'custscript_hoc_threshold_amt'});
            //alert('fpaThresholdAmt ->'+fpaThresholdAmt);
            //alert('hocThresholdAmt ->'+hocThresholdAmt);
            
            if(!fpaThresholdAmt) {
                fpaThresholdAmt = 0.00;
            }
            
            if(!hocThresholdAmt) {
                hocThresholdAmt = 0.00;
            }

            var recObj = record.load({type: 'purchaseorder', id: recId});
            if(recObj != null) {

                var departmentId    = recObj.getValue({fieldId: 'department'});
                var departmentIText = recObj.getText({fieldId: 'department'});
                var classId         = recObj.getValue({fieldId: 'class'});
                var classText       = recObj.getText({fieldId: 'class'});
                var lineCount       = recObj.getLineCount({sublistId: 'item'});
                var expLineCount    = recObj.getLineCount({sublistId: 'expense'});
                var requestorId     = recObj.getValue({fieldId: 'custbody_requestor'});
                var preparerId      = recObj.getValue({fieldId: 'employee'});
                var poAmount        = recObj.getValue({fieldId: 'total'});
                
                if(!preparerId) {
                    errorMessage = "Please select the 'Preparer' field value in order to  submit for approval.";
                    errorEncountered = true;
                }

                if(!errorEncountered) {
                    if(!requestorId) {
                        errorMessage = "Please select the 'Requestor' field value in order to  submit for approval.";
                        errorEncountered = true;

                    }
                }

                if(!errorEncountered) {
                    if(!departmentId) {
                        errorMessage = "Please select the 'Department' field value in order to  submit for approval.";
                        errorEncountered = true;

                    }
                }

                if(!errorEncountered) {
                    if(!classId) {
                        errorMessage = "Please select the 'Class' field value in order to  submit for approval.";
                        errorEncountered = true;

                    }
                }

                //Body Level FPA Approver validation.
                    if(!errorEncountered) {
                        
                        var fpaSearchFlt  = [];
                        var fpaSearchClm  = [];
                        var fpaSearchRes  = '';
                        
                        fpaSearchFlt.push(search.createFilter({name: 'custrecord_department', operator: search.Operator.ANYOF, values: departmentId}));
                        fpaSearchFlt.push(search.createFilter({name: 'custrecord_class', operator: search.Operator.ANYOF, values: classId}));
                        fpaSearchFlt.push(search.createFilter({name: 'isinactive', operator: search.Operator.IS, values: false}));
                        fpaSearchClm.push(search.createColumn({name: 'custrecord_fp_a_approver'}));
                        fpaSearchClm.push(search.createColumn({name: 'custrecord_hoc_approver'}));
                        fpaSearchRes = search.create({type: 'customrecord_fpa_bu_approver', filters: fpaSearchFlt, columns: fpaSearchClm});
    
                        console.log('Reached Here');
                        console.log('FPA Search Length - '+ fpaSearchRes.runPaged().count);
                        if(fpaSearchRes.runPaged().count > 0) {
                            
                            fpaSearchRes.run().each(function(result) {
                                //log.debug({title: "FP&A Approver", details: result.getValue({name: 'custrecord_fp_a_approver'})});
                                if(Number(poAmount) >= Number(fpaThresholdAmt)) {
                                    if(!fpaApproverId) {
                                        fpaApproverId = result.getValue({name: 'custrecord_fp_a_approver'});
                                    }
                                }
                                if(Number(poAmount) >= Number(hocThresholdAmt)) {
                                    if(!hocApproverId) {
                                        hocApproverId = result.getValue({name: 'custrecord_hoc_approver'});
                                    }
                                }
                                
                                return true;
                            });
                            if(Number(poAmount) > Number(fpaThresholdAmt)) {
                                if(!fpaApproverId) {
                                    errorEncountered    = true;
                                    errorMessage        = 'FP&A Approver is not defined for department "'+departmentIText+'" and class "'+classText+'". Please do the needful.';
                                }
                            }
                            if(Number(poAmount) > Number(hocThresholdAmt)) {
                                if(!hocApproverId) {
                                    errorEncountered    = true;
                                    errorMessage        = 'HOC Approver is not defined for department "'+departmentIText+'" and class "'+classText+'". Please do the needful.';
                                }
                            }
                            
                        }
                        else {
                            errorEncountered    = true;
                            errorMessage        = 'Department "'+departmentIText+'" and class "'+classText+'" combination is not available in FPA_HOC Approver master record.';
                        }

                    }//if(!errorEncountered)

                    
                //Line Level BU Approver Validation
                
                    /*if(!errorEncountered) {
                        for(var ln=0;ln<lineCount;ln++) {
                            var lnDeprtId   = recObj.getSublistValue({sublistId: 'item', fieldId: 'department', line: ln});
                            var lnClasId    = recObj.getSublistValue({sublistId: 'item', fieldId: 'class', line: ln});
                            if(!lnDeprtId || !lnClasId) {
                                errorMessage = "Please make sure, all line items have Department and Class value selected.";
                                errorEncountered = true;
                            }
                        }
                    }

                    if(!errorEncountered) {
                        for(var ln=0;ln<expLineCount;ln++) {
                            var lnDeprtId   = recObj.getSublistValue({sublistId: 'expense', fieldId: 'department', line: ln});
                            var lnClasId    = recObj.getSublistValue({sublistId: 'expense', fieldId: 'class', line: ln});
                            if(!lnDeprtId || !lnClasId) {
                                errorMessage = "Please make sure, all expense lines have Department and Class value selected.";
                                errorEncountered = true;
                            }
                        }
                    }
                    
                    if(!errorEncountered) {
                        var buSearchTmpFlt  = [];
                        var buSearchFlt  = [];
                        var buSearchClm  = [];
                        var buSearchRes  = '';
                        var departClassIdsArr  = [];
                        var departClassTxtArr  = [];
                        var buDprtClsAprvArr  = [];
                        
                        for(var i=0;i<lineCount;i++) {
                            var lnDeprtId   = recObj.getSublistValue({sublistId: 'item', fieldId: 'department', line: i});
                            var lnDeprtTx   = recObj.getSublistText({sublistId: 'item', fieldId: 'department', line: i});
                            var lnClasId    = recObj.getSublistValue({sublistId: 'item', fieldId: 'class', line: i});
                            var lnClasTx    = recObj.getSublistText({sublistId: 'item', fieldId: 'class', line: i});
                            var tmpStr      = lnDeprtId + ":" + lnClasId;
                            var tmpTxtStr   = lnDeprtTx + ":-:" + lnClasTx;
                            if(departClassIdsArr.length > 0) {
                                if(departClassIdsArr.indexOf(tmpStr) < 0) {
                                    departClassIdsArr.push(tmpStr);
                                    departClassTxtArr.push(tmpTxtStr);
                                    buDprtClsAprvArr.push(0);
                                    buSearchTmpFlt.push("OR");
                                    buSearchTmpFlt.push([["custrecord_department", search.Operator.ANYOF, lnDeprtId], "AND", ["custrecord_class", search.Operator.ANYOF, lnClasId]]);
                                }                                
                            }
                            else {
                                departClassIdsArr.push(tmpStr);
                                departClassTxtArr.push(tmpTxtStr);
                                buDprtClsAprvArr.push(0);
                                buSearchTmpFlt.push([["custrecord_department", search.Operator.ANYOF, lnDeprtId], "AND", ["custrecord_class", search.Operator.ANYOF, lnClasId]]);
                            }
                        }

                        for(var i=0;i<expLineCount;i++) {
                            var lnDeprtId   = recObj.getSublistValue({sublistId: 'expense', fieldId: 'department', line: i});
                            var lnDeprtTx   = recObj.getSublistText({sublistId: 'expense', fieldId: 'department', line: i});
                            var lnClasId    = recObj.getSublistValue({sublistId: 'expense', fieldId: 'class', line: i});
                            var lnClasTx    = recObj.getSublistText({sublistId: 'expense', fieldId: 'class', line: i});
                            var tmpStr      = lnDeprtId + ":" + lnClasId;
                            var tmpTxtStr   = lnDeprtTx + ":-:" + lnClasTx;
                            if(departClassIdsArr.length > 0) {
                                if(departClassIdsArr.indexOf(tmpStr) < 0) {
                                    departClassIdsArr.push(tmpStr);
                                    departClassTxtArr.push(tmpTxtStr);
                                    buDprtClsAprvArr.push(0);
                                    buSearchTmpFlt.push("OR");
                                    buSearchTmpFlt.push([["custrecord_department", search.Operator.ANYOF, lnDeprtId], "AND", ["custrecord_class", search.Operator.ANYOF, lnClasId]]);
                                }                                
                            }
                            else {
                                departClassIdsArr.push(tmpStr);
                                departClassTxtArr.push(tmpTxtStr);
                                buDprtClsAprvArr.push(0);
                                buSearchTmpFlt.push([["custrecord_department", search.Operator.ANYOF, lnDeprtId], "AND", ["custrecord_class", search.Operator.ANYOF, lnClasId]]);
                            }
                        }

                        //console.log("departClassIdsArr => " + departClassIdsArr);
                        //console.log("departClassTxtArr => " + departClassTxtArr);
                        if(buSearchTmpFlt) {
                            buSearchFlt.push(buSearchTmpFlt);
                            buSearchFlt.push("AND");
                            buSearchFlt.push(["isinactive", search.Operator.IS, "F"])
                        }
                        //console.log(buSearchFlt);
                        buSearchClm.push(search.createColumn({name: 'custrecord_department'}));
                        buSearchClm.push(search.createColumn({name: 'custrecord_class'}));
                        buSearchClm.push(search.createColumn({name: 'custrecord_bu_approver'}));
                        buSearchRes = search.create({type: 'customrecord_fpa_bu_approver', filters: buSearchFlt, columns: buSearchClm});

                        if(buSearchRes.runPaged().count > 0) {
                            //console.log(buSearchRes);
                            buSearchRes.run().each(function(result1) {

                                var budept = result1.getValue({name: 'custrecord_department'});
                                var buClas = result1.getValue({name: 'custrecord_class'});
                                var buAprv = result1.getValue({name: 'custrecord_bu_approver'});
                                var tmpTxt = budept + ":" + buClas;
                                //console.log(tmpTxt);
                                var indx   = departClassIdsArr.indexOf(tmpTxt);
                                if(indx >= 0) {
                                    buDprtClsAprvArr[indx] = buAprv;
                                }
                                return true;
                            });
                        }
                        console.log("buDprtClsAprvArr => "+buDprtClsAprvArr);
                        if(buDprtClsAprvArr.indexOf(0) >= 0) {
                            errorEncountered    = true;
                            errorMessage        = "We do not found the BU approver for following department and class combination,\n\n";
                            for(var buer = buDprtClsAprvArr.indexOf(0);buer<buDprtClsAprvArr.length;buer++) {
                                if(buDprtClsAprvArr[buer] == 0) {
                                    var buErrorDptCls = departClassTxtArr[buer];
                                    var buErrorDptClsArr = buErrorDptCls.split(":-:");
                                    var buDprtTxt = buErrorDptClsArr[0];
                                    var buClsTxt  = buErrorDptClsArr[1];
                                    errorMessage        += 'Department: "'+buDprtTxt+'" and class: "'+buClsTxt+'",\n';
                                }
                            }
                            errorMessage += "\nPlease do the needful.";
                            
                        }

                        //console.log('departClassIdsArr -> '+ departClassIdsArr);
                        //console.log('buDprtClsAprvArr -> '+ buDprtClsAprvArr);
                    }*/

            }

            if(errorEncountered) {
                alert(errorMessage);
            }
            else {
                
                console.log('fpaApproverId -> '+fpaApproverId);
                console.log('hocApproverId -> '+hocApproverId);
                //console.log('buDprtClsAprvArr -> '+buDprtClsAprvArr);
                //alert('Reached Here..Good to process for submission.');
                var params = {'prId': recId, 'fpaapprover': fpaApproverId, 'hocapprover':hocApproverId};
                var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_pr_approval_flow_sl', deploymentId: 'customdeploy_yil_pr_approval_flow_sl', params: params});
                var response = https.get({url: suiteUrl});
                console.log('response ->' + response.body);
                if(response.body == 'true') {
                    window.location.reload();
                }
                else {
                    alert(response.body);
                }
            }

        }
        
    }

    function approvePurchaseRequestFlow(recId, prAfId, nextLevel) {
        var param = {processFlag: 'a', prAfId: prAfId, recId: recId, nextLevel: nextLevel, fromrec: "1"};
        //redirect.toSuitelet({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', isExternal: false});
        var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', params: param});
        window.location.href = suiteUrl;
                
    }
    
    function rejectPurchaseRequestFlow(recId, prAfId, nextLevel) {
        var param = {processFlag: 'r', prAfId: prAfId, recId: recId, nextLevel: nextLevel, fromrec: "1"};
        //redirect.toSuitelet({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', isExternal: false});
        var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', params: param});
        window.location.href = suiteUrl;
    }

    function cancelRequest(recId, prAfId) {
        var param = {processFlag: 'c', prAfId: prAfId, recId: recId, fromrec: "1"};
        //redirect.toSuitelet({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', isExternal: false});
        var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', params: param});
        window.location.href = suiteUrl;
    }

    function sendNotification(recId, prAfId) {
        var params = {processFlag: 's', prAfId: prAfId, recId: recId};
        //redirect.toSuitelet({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', isExternal: false});
        //var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', params: param});
        //window.location.href = suiteUrl;

        //var params = {'prId': recId, 'fpaapprover': fpaApproverId, 'buapprovers': buDprtClsAprvArr.toString()};
        var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', params: params});
        var response = https.get({url: suiteUrl});
        console.log('Response -> '+response);
        if(response.body == 'true') {
            alert("Next approver(s) has been notified via email for their approval.");
        }


    }


    return {
        pageInit: pageInit,
        postSourcing: postSourcing,
        lineInit: lineInit,
        fieldChanged: fieldChanged,
        validateLine: validateLine,
        submitApprovalFun: submitApprovalFun,
        approvePurchaseRequestFlow: approvePurchaseRequestFlow,
        rejectPurchaseRequestFlow: rejectPurchaseRequestFlow,
        sendNotification: sendNotification,
        cancelRequest: cancelRequest
    }

});