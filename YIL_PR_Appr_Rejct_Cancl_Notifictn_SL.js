/***
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * 
 * 
 */
define(["N/http", "N/record", "N/ui/serverWidget", "N/render", "N/email", "N/search", "N/runtime", "N/url", "N/encode", "N/file"], function(http, record, ui, render, email, search, runtime, url, encode, file) {

    function onRequest(context) {

        if(context.request.method == http.Method.GET) {
            
            var requestObj = context.request;
            var processFlag = requestObj.parameters['processFlag'];
            var fromRecordFlag = requestObj.parameters['fromrec'];
            var form = ui.createForm({title: ' ', hideNavBar: true});
            
            var processFlagField = form.addField({id: 'custpage_flag_type', type: ui.FieldType.TEXT, label: 'Process Type'});
            processFlagField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
            if(processFlag) { processFlagField.defaultValue = processFlag; }
                        
            var fromRecordFlagField = form.addField({id: 'custpage_from_rec_flag', type: ui.FieldType.TEXT, label: 'From Record Type'});
            fromRecordFlagField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
            if(fromRecordFlag) { fromRecordFlagField.defaultValue = fromRecordFlag; }
            
            log.debug({title: 'processFlag', details: processFlag});
            
            if(processFlag == "a") {
                //Purchase Request Approve
                var purchaseRequestId   = requestObj.parameters['recId'];
                var purchaseApprFlowId  = requestObj.parameters['prAfId'];
                var nexeLevelCount      = requestObj.parameters['nextLevel'];
                if(!fromRecordFlag) {
                    purchaseRequestId = getDecodedValue(purchaseRequestId);
                    purchaseApprFlowId = getDecodedValue(purchaseApprFlowId);
                    nexeLevelCount = getDecodedValue(nexeLevelCount);
                }
                
                _approverFunctionality(context, requestObj, form, purchaseRequestId, purchaseApprFlowId, nexeLevelCount, fromRecordFlag);

            }
            else if(processFlag == "r") {
                //Purchase Request Reject
                var purchaseRequestId   = requestObj.parameters['recId'];
                var purchaseApprFlowId  = requestObj.parameters['prAfId'];
                var nexeLevelCount      = requestObj.parameters['nextLevel'];

                if(!fromRecordFlag) {
                    purchaseRequestId = getDecodedValue(purchaseRequestId);
                    purchaseApprFlowId = getDecodedValue(purchaseApprFlowId);
                    nexeLevelCount = getDecodedValue(nexeLevelCount);
                }

                _rejectFunctionality(context, requestObj, form, purchaseRequestId, purchaseApprFlowId, nexeLevelCount, fromRecordFlag);
                
            }
            else if(processFlag == "c") {
                //Purchase Order Cancel
                var purchaseRequestId   = requestObj.parameters['recId'];
                var purchaseApprFlowId  = requestObj.parameters['prAfId'];

                _cancelFunctionality(context, requestObj, form, purchaseRequestId, purchaseApprFlowId);
            }
            else if(processFlag == "s") {
                //Purchase Request Send Notification
                var purchaseRequestId   = requestObj.parameters['recId'];
                var purchaseApprFlowId  = requestObj.parameters['prAfId'];

                _sendNotificationFunctionality(context, requestObj, form, purchaseRequestId, purchaseApprFlowId);
                return true;
            }
            else if(processFlag == "p") {
                //Purchase Request Client Script to set Department and Class of Requester.
                var requestorId = requestObj.parameters['reqid'];

                if(requestorId) {
                    var empLookupObj = search.lookupFields({type:search.Type.EMPLOYEE, id: requestorId, columns: ['department', 'class']});
                    if(empLookupObj) {
                        var empDepartmentId = '';
                        if(empLookupObj.department[0]) {
                            empDepartmentId = empLookupObj.department[0].value;
                        }
                        var empClassId = '';
                        if(empLookupObj.class[0]) {
                            empClassId = empLookupObj.class[0].value;
                        }
                        
                        var responseText = empDepartmentId + "," + empClassId;
                        //log.debug({title: responseText, details: responseText});
                        context.response.write({output: responseText});
                        return true;
                    }
                }
            }
            else if(processFlag == "ba") {
                //Bill Approval
                var billId = context.request.parameters['bid'];
                if(!fromRecordFlag) {
                    billId = getDecodedValue(billId);
                }
                var submitBtn = form.addSubmitButton({label: 'Submit'});
                submitBtn.isHidden = true;
                var billIdField = form.addField({id: 'custpage_bill_id', type: 'text', label: ' '});
                billIdField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});

                if(billId) {
                    billIdField.defaultValue = billId;
                    var submitField = form.addField({id: 'custpage_submit', type: ui.FieldType.INLINEHTML, label: ' '});
                    submitField.defaultValue = "<script>setTimeout(function() { document.getElementById('main_form').submit(); }, 800);</script>";

                }//if(billId)
                
            }
            else if(processFlag = "br") {
                //Bill Rejection
                var billId = context.request.parameters['bid'];
                if(!fromRecordFlag) {
                    billId = getDecodedValue(billId);
                }
                var billIdField = form.addField({id: 'custpage_bill_id', type: 'text', label: ' '});
                billIdField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});

                if(billId) {
                    billIdField.defaultValue = billId;
                }
                _billRejectionFunctionality(billId, form, fromRecordFlag);

            }

            context.response.writePage(form);
            //return true;

        }
        else if(context.request.method == http.Method.POST) {

            var processFlag = context.request.parameters['custpage_flag_type'];
            var fromRecordFlag = context.request.parameters['custpage_from_rec_flag'];
            var purchaseRequestId = context.request.parameters['custpage_pr_id'];
            log.debug({title: 'ProcessFlag', details: processFlag});

            if(processFlag == "a") {
                var approveStatus = context.request.parameters['custpage_bfr_sts'];
                if(approveStatus == 1) {
                    //You have approved message
                    var form = ui.createForm({title: 'PR Approval', hideNavBar: true});
                    var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                    var defaultText = '<center><font size="5" face="arial">You have approved the Purchase Request. Thank you.</font></center>';
                    
                    if(fromRecordFlag) {
                        //Show Back button
                        defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/purchord.nl?id='+purchaseRequestId+'">View PR</a></font></center>';
                    }

                    msgFld.defaultValue = defaultText;
                    context.response.writePage(form);
                }
                else if(approveStatus == 2) {
                    //You already approved message
                    var form = ui.createForm({title: ' ', hideNavBar: true});
                    var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                    var defaultText = '<center><font size="5" face="arial">You have already approved this Purchase Request. Thank you.</font></center>';
                    
                    if(fromRecordFlag) {
                        //Show Back button
                        defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/purchord.nl?id='+purchaseRequestId+'">View PR</a></font></center>';
                    }

                    msgFld.defaultValue = defaultText;
                    context.response.writePage(form);
                }
                else if(approveStatus == 3) {
                    //You already rejected message
                    var form = ui.createForm({title: ' ', hideNavBar: true});
                    var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                    var defaultText = '<center><font size="5" face="arial">You have already rejected this Purchase Request. Thank you.</font></center>';
                    
                    if(fromRecordFlag) {
                        //Show Back button
                        defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/purchord.nl?id='+purchaseRequestId+'">View PR</a></font></center>';
                    }

                    msgFld.defaultValue = defaultText;
                    context.response.writePage(form);
                }
            }            
            else if(processFlag == "r") {
                
                var reasonText  = context.request.parameters['custpage_reason'];
                var prId        = context.request.parameters['custpage_pr_id'];
                var prafId      = context.request.parameters['custpage_praf_id'];
                var nextLevel   = context.request.parameters['custpage_nxt_lvl'];
                var fromRecordFlag = context.request.parameters['custpage_from_rec_flag'];
                var updatedPRID = '';
                var updatedPRFAID = '';
                var requestorId = '';
                var preparerId = '';

                if(reasonText && prId && prafId && nextLevel) {
                    
                    var prfaObj = record.load({type: 'customrecord_pr_approval_flow' , id: prafId});
                    var prevApproverObj = {approvalLvl: [], approverIds: [], desig: [], approverNms: [], approvalStatus: []};

                    try {
                        if(prfaObj) {
                            var statusFieldText = 'custrecord_approval_status_'+nextLevel;
                            prfaObj.setValue({fieldId: statusFieldText.toString(), value: 3});
                            
                            var noOfLevels = prfaObj.getValue({fieldId: 'custrecord_no_of_level'});
                            for(var ln=1;ln<=noOfLevels;ln++) {
                                var tempNextApproverField       = "custrecord_approver_"+ln;
                                var tempStatusFieldText = "custrecord_approval_status_"+ln;
                                var lvlStatus = prfaObj.getValue({fieldId: tempStatusFieldText.toString()});
                                if(!lvlStatus) {lvlStatus = "0";}
                               
                                if(lvlStatus == 2 || Number(ln) == Number(nextLevel)) {
                                   
                                    if(Number(ln) == Number(nextLevel)) {
                                        prevApproverObj.approvalLvl.push(ln);
                                        prevApproverObj.approverIds.push(prfaObj.getValue({fieldId: tempNextApproverField.toString()}));
                                        prevApproverObj.desig.push("");
                                        prevApproverObj.approverNms.push("");
                                        prevApproverObj.approvalStatus.push("Rejected");
                                        prfaObj.setValue({fieldId: statusFieldText.toString(), value: 3});
                                    }
                                    else {
                                        prevApproverObj.approvalLvl.push(ln);
                                        prevApproverObj.approverIds.push(prfaObj.getValue({fieldId: tempNextApproverField.toString()}));
                                        prevApproverObj.desig.push("");
                                        prevApproverObj.approverNms.push("");
                                        prevApproverObj.approvalStatus.push(prfaObj.getText({fieldId: tempStatusFieldText.toString()}));
                                    }
                                }
                                
    
                            }//for(var ln=1;ln<=noOfLevels;ln++)

                            updatedPRFAID = prfaObj.save();
    
                            var prObj = record.load({type: 'purchaseorder', id: prId});
                            if(prObj) {
                                requestorId = prObj.getValue({fieldId: 'custbody_requestor'});
                                preparerId  = prObj.getValue({fieldId: 'employee'});
                                prObj.setValue({fieldId: 'custbody_rejection_justifctn', value: reasonText.toString()});
                                prObj.setValue({fieldId: 'custbody_pr_approval_status', value: "Rejected."});
                                prObj.setValue({fieldId: 'approvalstatus', value: 3});
                                updatedPRID = prObj.save();
                            }
                        }
                    }
                    catch(err) {
                        log.debug({title: "Error Rejecting Purchase Request", details:err});
                    }
                    var defaultText = '';
                    if(updatedPRFAID && updatedPRID) {
                        defaultText = '<center><font size="5" face="arial">You have rejected the Purchase Request. Thank you.</font></center>';
                    
                        if(fromRecordFlag) {
                            //Show Back button
                            defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/purchord.nl?id='+prId+'">View PR</a></font></center>';
                        }
                        var prevApproverTableString = _getApproverWithDesignTable(prevApproverObj);
                        log.debug({title:"prevApproverObj", details: prevApproverObj});
                        _sendRejectionEmail(prId, requestorId, preparerId, reasonText, prevApproverTableString);
                    }
                    else {
                        defaultText = '<center><font size="5" face="arial">There is some problem to reject the Purchase Request. Please contact your administrator. Thank you.</font></center>';
                    
                        if(fromRecordFlag) {
                            //Show Back button
                            defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/purchord.nl?id='+prId+'">View PR</a></font></center>';
                        }
                    }
                    var form = ui.createForm({title: 'PR Rejection', hideNavBar: true});
                    var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                    
                    msgFld.defaultValue = defaultText;
                    context.response.writePage(form);


                }

            }
            else if(processFlag == "c") {
                var reasonText  = context.request.parameters['custpage_reason'];
                var prId        = context.request.parameters['custpage_pr_id'];
                var prafId      = context.request.parameters['custpage_praf_id'];
                var fromRecordFlag = context.request.parameters['custpage_from_rec_flag'];
                var updatedPRID = '';
                var updatedPRFAID = '';
                var requestorId = '';
                var preparerId = '';
                var prevApproverObj = {approvalLvl: [], approverIds: [], desig: [], approverNms: [], approvalStatus: []};


                if(reasonText && prId) {
                    
                    try {
                        
                        if(prafId) {
                            var prfaObj = record.load({type: 'customrecord_pr_approval_flow' , id: prafId});
                            if(prfaObj) {
                                var noOfLevels = prfaObj.getValue({fieldId: 'custrecord_no_of_level'});
                                for(var ln=1;ln<=noOfLevels;ln++) {
                                    var tempNextApproverField       = "custrecord_approver_"+ln;
                                    var tempStatusFieldText = "custrecord_approval_status_"+ln;
                                    var lvlStatus = prfaObj.getValue({fieldId: tempStatusFieldText.toString()});
                                    if(!lvlStatus) {lvlStatus = "0";}
                                   
                                    if(lvlStatus == 2) {
                                        prevApproverObj.approvalLvl.push(ln);
                                        prevApproverObj.approverIds.push(prfaObj.getValue({fieldId: tempNextApproverField.toString()}));
                                        prevApproverObj.desig.push("");
                                        prevApproverObj.approverNms.push("");
                                        prevApproverObj.approvalStatus.push(prfaObj.getText({fieldId: tempStatusFieldText.toString()}));
                                    }
                                }//for(var ln=1;ln<=noOfLevels;ln++)
                            }
                        }
                        
                        

                        var prObj = record.load({type: 'purchaseorder', id: prId});
                        if(prObj) {
                            requestorId = prObj.getValue({fieldId: 'custbody_requestor'});
                            preparerId  = prObj.getValue({fieldId: 'employee'});
                            prObj.setValue({fieldId: 'custbody_cancellation_reason', value: reasonText.toString()});
                            var lineCount = prObj.getLineCount({sublistId: 'item'});
                            var expLineCount = prObj.getLineCount({sublistId: 'expense'});
                            for(var ln=0;ln<lineCount;ln++) {

                                prObj.setSublistValue({sublistId: 'item', fieldId: 'isclosed', line: ln, value: true});

                            }//for(var ln=0;ln<lineCount;ln++)
                            for(var el=0;el<expLineCount;el++) {
                                prObj.setSublistValue({sublistId: 'expense', fieldId: 'isclosed', line: el, value: true});
                            }

                            updatedPRID = prObj.save();
                        }
                    
                    }
                    catch(err) {
                        log.debug({title: "Error Cancelling Purchase Order", details:err});
                    }
                    var defaultText = '';
                    if(updatedPRID) {
                        defaultText = '<center><font size="5" face="arial">You have cancelled the Purchase Order. Thank you.</font></center>';
                    
                        if(fromRecordFlag) {
                            //Show Back button
                            defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/purchord.nl?id='+prId+'">View PO</a></font></center>';
                        }
                        var prevApproverTableString = _getApproverWithDesignTable(prevApproverObj);
                        log.debug({title:"prevApproverObj", details: prevApproverObj});
                        _sendCancelEmail(prId, requestorId, preparerId, reasonText, prevApproverTableString);
                    }
                    else {
                        defaultText = '<center><font size="5" face="arial">There is some problem to cancel the Purchase Order. Please contact your administrator. Thank you.</font></center>';
                    
                        if(fromRecordFlag) {
                            //Show Back button
                            defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/purchord.nl?id='+prId+'">View PO</a></font></center>';
                        }
                    }
                    var form = ui.createForm({title: 'PR Cancellation', hideNavBar: true});
                    var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                    
                    msgFld.defaultValue = defaultText;
                    context.response.writePage(form);


                }
            }
            else if(processFlag == "ba") {
                var billId = context.request.parameters['custpage_bill_id'];
                var form = ui.createForm({title: 'Bill Approval', hideNavBar: true});
                var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                var poTableString = "";
                try {
                    var billRecObj = record.load({type: 'vendorbill', id: billId});
                    if(billRecObj) {
                        var billId = '', billApprovalStatus = '', tranIdText = '', requestorName = '', customApproverId = '', billCreatorId = '', preparerName = '', vendorName  = '', totalAmount = '', departnmentName = '', className = '';
                        billId = billRecObj.id;
                        tranIdText = billRecObj.getValue({fieldId: 'transactionnumber'});
                        billApprovalStatus = billRecObj.getValue({fieldId: 'approvalstatus'});
                        requestorName = billRecObj.getText({fieldId: 'custbody11_2'});
                        customApproverId = billRecObj.getValue({fieldId: 'custbody11_2'});
                        preparerName = billRecObj.getText({fieldId: 'custbody_creator'});
                        billCreatorId = billRecObj.getValue({fieldId: 'custbody_creator'});
                        vendorName = billRecObj.getText({fieldId: 'entity'});
                        totalAmount = billRecObj.getValue({fieldId: 'total'});
                        totalAmount = Number(totalAmount).toFixed(2);
                        poTableString += _getItemAndExpenseTable(billRecObj);

                        if(billApprovalStatus == 2) {
                            var defaultText = '<center><font size="5" face="arial">You have already approved this Vendor Bill. Thank you.</font></center>';
                            msgFld.defaultValue = defaultText;
                        }
                        else if(billApprovalStatus == 3) {
                            var defaultText = '<center><font size="5" face="arial">You have already rejected this Vendor Bill. Thank you.</font></center>';
                            msgFld.defaultValue = defaultText;
                        }
                        else {
                            billRecObj.setValue({fieldId: 'approvalstatus', value: 2});
                            billRecObj.setValue({fieldId: 'custbody10_2', value: 2});
                            var updatedBillId = billRecObj.save();
                            if(updatedBillId) {
                                _sendBillApprovedEmailToCreator(updatedBillId, tranIdText, requestorName, customApproverId, preparerName, billCreatorId, vendorName, totalAmount, poTableString);
                                var defaultText = '<center><font size="5" face="arial">You have approved this Vendor Bill Successfully. Thank you.</font></center>';
                                msgFld.defaultValue = defaultText;
                            }
                        }
                        
                    }
                }
                catch(err) {
                    log.debug({title: "Error Approving Vendor Bill : "+billId, details: err});
                }

                if(fromRecordFlag) {
                    //Show Back button
                    defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+billId+'">View Bill</a></font></center>';
                }

                msgFld.defaultValue = defaultText;
                context.response.writePage(form);
            }
            else if(processFlag == "br") {

                var billId = context.request.parameters['custpage_bill_id'];
                var reasonText  = context.request.parameters['custpage_reason'];
                var form = ui.createForm({title: 'Bill Rejection', hideNavBar: true});
                var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                var defaultText = '';
                var poTableString = "";

                try {
                    var billRecObj = record.load({type: 'vendorbill', id: billId});
                    if(billRecObj) {
                        var billApprovalStatus = '', tranIdText = '', requestorName = '', customApproverId = '', billCreatorId = '', preparerName = '', vendorName  = '', totalAmount = '', departnmentName = '', className = '';
                        tranIdText = billRecObj.getValue({fieldId: 'transactionnumber'});
                        billApprovalStatus = billRecObj.getValue({fieldId: 'approvalstatus'});
                        requestorName = billRecObj.getText({fieldId: 'custbody11_2'});
                        customApproverId = billRecObj.getValue({fieldId: 'custbody11_2'});
                        preparerName = billRecObj.getText({fieldId: 'custbody_creator'});
                        billCreatorId = billRecObj.getValue({fieldId: 'custbody_creator'});
                        vendorName = billRecObj.getText({fieldId: 'entity'});
                        totalAmount = billRecObj.getValue({fieldId: 'total'});
                        totalAmount = Number(totalAmount).toFixed(2);
                        poTableString += _getItemAndExpenseTable(billRecObj);

                            billRecObj.setValue({fieldId: 'approvalstatus', value: 3});
                            billRecObj.setValue({fieldId: 'custbody10_2', value: 3});
                            billRecObj.setValue({fieldId: 'custbody_rejection_justifctn', value: reasonText});

                            var updatedBillId = billRecObj.save();
                            if(updatedBillId) {
                                _sendBillRejectEmailToCreator(updatedBillId, tranIdText, requestorName, customApproverId, preparerName, billCreatorId, vendorName, totalAmount, reasonText, poTableString);
                                defaultText = '<center><font size="5" face="arial">You have Rejected this Vendor Bill Successfully. Thank you.</font></center>';
                                msgFld.defaultValue = defaultText;
                            }
                        
                        
                    }
                }
                catch(err) {
                    log.debug({title: "Error Rejecting Vendor Bill : "+billId, details: err});
                }

                if(fromRecordFlag) {
                    //Show Back button
                    defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+billId+'">View Bill</a></font></center>';
                }

                msgFld.defaultValue = defaultText;
                context.response.writePage(form);

            }
        }

    }

    function _approverFunctionality(context, requestObj, form, purchaseRequestId, purchaseApprFlowId, nexeLevelCount, fromRecordFlag) {
        
        var purchaseRequesField     = form.addField({id: 'custpage_pr_id', type: ui.FieldType.SELECT, label: 'Purchase Request', source: 'transaction'});
        var purchApproveFlowField   = form.addField({id: 'custpage_praf_id', type: ui.FieldType.SELECT, label: 'Purchase Approval Flow', source: 'customrecord_pr_approval_flow'});
        var nextLevelField          = form.addField({id: 'custpage_nxt_lvl', type:ui.FieldType.TEXT, label: 'Next Level'});
        var statusBeforeApproveField     = form.addField({id: 'custpage_bfr_sts', type:ui.FieldType.TEXT, label: 'Status Before Approve'});
        var submitBtn = form.addSubmitButton({label: 'Submit'});
        submitBtn.isHidden = true;

        purchaseRequesField.defaultValue = purchaseRequestId;
        purchApproveFlowField.defaultValue = purchaseApprFlowId;
        nextLevelField.defaultValue = nexeLevelCount;

        purchaseRequesField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
        purchApproveFlowField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});;
        nextLevelField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
        statusBeforeApproveField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});

        if(purchaseRequestId && purchaseApprFlowId && nexeLevelCount) {

            var purchaseRequestStatus = search.lookupFields({type: 'purchaseorder', id: purchaseRequestId, columns: ['approvalstatus']});
            var proceedFlag = true;
            if(purchaseRequestStatus.approvalstatus[0]) {
                if(purchaseRequestStatus.approvalstatus[0].value == 3) {

                    var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                    var defaultText = '<center><font size="5" face="arial">This Purchase Request is already rejected and not in use any more. Thank you.</font></center>';
                    
                    if(fromRecordFlag) {
                        //Show Back button
                        defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/purchord.nl?id='+purchaseRequestId+'">View PR</a></font></center>';
                    }
                    
                    msgFld.defaultValue = defaultText;
                    proceedFlag = false;
                }
            }

            if(proceedFlag) {

                var purchaseApprovalFlowObj = record.load({type: 'customrecord_pr_approval_flow', id: purchaseApprFlowId, isDynamic: true});

                if(purchaseApprovalFlowObj) {
    
                    var statusFieldText = "custrecord_approval_status_"+nexeLevelCount;
                    var noOfLevels  = purchaseApprovalFlowObj.getValue({fieldId: 'custrecord_no_of_level'});
                    var buApprovals = purchaseApprovalFlowObj.getValue({fieldId: 'custrecord_bu_approvar_level_no'});
                    var statusBeforeApproveValue = purchaseApprovalFlowObj.getValue({fieldId: statusFieldText.toString()});
                    var buStart     = '';
                    var buEnd       = '';
                    var purchaseRequestStatus = '';
                    var sendEmailTo    = [];
                    var emailNxtLevelAtt = [];
    
                    statusBeforeApproveField.defaultValue = statusBeforeApproveValue;
    
                    if(buApprovals) {
                        var buApprovalsArr = buApprovals.split(",");
                        if(buApprovalsArr) {
                            buStart = buApprovalsArr[0];
                            buEnd = buApprovalsArr[1];
                        }
                    }
                    log.debug({title: "statusBeforeApproveValue", details: statusBeforeApproveValue});
                    if(statusBeforeApproveValue == 1) {
                        log.debug({title: "nexeLevelCount < buStart", details: nexeLevelCount +" & "+ buStart});
                        if(Number(nexeLevelCount) < Number(buStart)) {
                            log.debug({title: "statusFieldText", details: statusFieldText});
                            
                            purchaseApprovalFlowObj.setValue({fieldId: statusFieldText.toString(), value: "2"});
                            nexeLevelCount++;
    
                            var nxtAprvrFieldText = "custrecord_approver_"+nexeLevelCount;
                            var nxtStatusFieldText = "custrecord_approval_status_"+nexeLevelCount;
                            var nxtSkipFieldText = "custrecord_approval_skip_"+nexeLevelCount;
    
                            var nxtAprId = purchaseApprovalFlowObj.getValue({fieldId: nxtAprvrFieldText.toString()});
                            var nxtAprSkp = purchaseApprovalFlowObj.getValue({fieldId: nxtSkipFieldText.toString()});
                            
                            while(nxtAprSkp) {
                                purchaseApprovalFlowObj.setValue({fieldId: nxtStatusFieldText, value: "2"});
                                nexeLevelCount++;
                                var nxtAprvrFieldText = "custrecord_approver_"+nexeLevelCount;
                                var nxtStatusFieldText = "custrecord_approval_status_"+nexeLevelCount;
                                var nxtSkipFieldText = "custrecord_approval_skip_"+nexeLevelCount;
                                nxtAprId = purchaseApprovalFlowObj.getValue({fieldId: nxtAprvrFieldText.toString()});
                                nxtAprSkp = purchaseApprovalFlowObj.getValue({fieldId: nxtSkipFieldText.toString()});
                            }
    
                            if(Number(nexeLevelCount) < Number(buStart)) {
                                if(nxtAprId) {
                                    purchaseApprovalFlowObj.setValue({fieldId: nxtStatusFieldText.toString(), value: "1"});
                                    sendEmailTo.push(nxtAprId);
                                    emailNxtLevelAtt.push(nexeLevelCount);
                                }
                            }
                            else if(Number(nexeLevelCount) >= Number(buStart) && Number(nexeLevelCount) <= Number(buEnd)) {
                                for(var na=nexeLevelCount;na<=buEnd;na++) {
                                    var nxtAprvrFieldText = "custrecord_approver_"+na;
                                    var nxtStatusFieldText = "custrecord_approval_status_"+na;
                                    var nxtSkipFieldText = "custrecord_approval_skip_"+na;
                                    var nxtAprId = purchaseApprovalFlowObj.getValue({fieldId: nxtAprvrFieldText.toString()});
                                    var nxtAprSkp = purchaseApprovalFlowObj.getValue({fieldId: nxtSkipFieldText.toString()});
                                    if(nxtAprSkp) {
                                        purchaseApprovalFlowObj.setValue({fieldId: nxtStatusFieldText.toString(), value: "2"});
                                    }
                                    else {
                                        purchaseApprovalFlowObj.setValue({fieldId: nxtStatusFieldText.toString(), value: "1"});
                                        sendEmailTo.push(nxtAprId);
                                        emailNxtLevelAtt.push(na);
                                    }
                                }
                            }
                            else {
                                if(nxtAprId) {
                                    purchaseApprovalFlowObj.setValue({fieldId: nxtStatusFieldText.toString(), value: "1"});
                                    sendEmailTo.push(nxtAprId);
                                    emailNxtLevelAtt.push(nexeLevelCount);
                                }
                            }
                            
                        }
                        else if(Number(nexeLevelCount) >= Number(buStart) && Number(nexeLevelCount) <= Number(buEnd)) {
                            
                            purchaseApprovalFlowObj.setValue({fieldId: statusFieldText.toString(), value: "2"});
                            //nexeLevelCount++;
    
                            var allBUApproved = [];
                            for(var na=Number(buStart);na<=Number(buEnd);na++) {
                                var nxtStatusFieldText = "custrecord_approval_status_"+na;
                                var nxtAprStus = purchaseApprovalFlowObj.getValue({fieldId: nxtStatusFieldText.toString()});
                                allBUApproved.push(nxtAprStus);
                            }
                            log.debug({title: "allBUApproved", details: allBUApproved});
                            //log.debug({title: "allBUApproved.indexOf(1)", details: allBUApproved.indexOf("1")});
                            if(allBUApproved.indexOf("1") < 0) {
                                nexeLevelCount = Number(buEnd) + 1;
                                var nxtAprvrFieldText = "custrecord_approver_"+nexeLevelCount;
                                var nxtStatusFieldText = "custrecord_approval_status_"+nexeLevelCount;
                                var nxtSkipFieldText = "custrecord_approval_skip_"+nexeLevelCount;
                                var nxtAprId = purchaseApprovalFlowObj.getValue({fieldId: nxtAprvrFieldText.toString()});
                                var nxtAprSkp = purchaseApprovalFlowObj.getValue({fieldId: nxtSkipFieldText.toString()});
                                //log.debug({title: "nxtAprId & nxtAprSkp & nxtSkipFieldText", details: nxtAprId +" & "+ nxtAprSkp +" & "+ nxtSkipFieldText});
                                while(nxtAprSkp) {
                                    purchaseApprovalFlowObj.setValue({fieldId: nxtStatusFieldText, value: "2"});
                                    nexeLevelCount++;
                                    var nxtAprvrFieldText = "custrecord_approver_"+nexeLevelCount;
                                    var nxtStatusFieldText = "custrecord_approval_status_"+nexeLevelCount;
                                    var nxtSkipFieldText = "custrecord_approval_skip_"+nexeLevelCount;
                                    nxtAprId = purchaseApprovalFlowObj.getValue({fieldId: nxtAprvrFieldText.toString()});
                                    nxtAprSkp = purchaseApprovalFlowObj.getValue({fieldId: nxtSkipFieldText.toString()});
                                }
                                if(nxtAprId) {
                                    purchaseApprovalFlowObj.setValue({fieldId: nxtStatusFieldText.toString(), value: "1"});
                                    sendEmailTo.push(nxtAprId);
                                    emailNxtLevelAtt.push(nexeLevelCount);
                                }
                            }
                        }
                        else if(Number(nexeLevelCount) > Number(buEnd)) {
                            //Set After Approvers
                            purchaseApprovalFlowObj.setValue({fieldId: statusFieldText.toString(), value: "2"});
                            nexeLevelCount++;
                            
                            var nxtAprvrFieldText = "custrecord_approver_"+nexeLevelCount;
                            var nxtStatusFieldText = "custrecord_approval_status_"+nexeLevelCount;
                            var nxtSkipFieldText = "custrecord_approval_skip_"+nexeLevelCount;
                            var nxtAprId = purchaseApprovalFlowObj.getValue({fieldId: nxtAprvrFieldText.toString()});
                            var nxtAprSkp = purchaseApprovalFlowObj.getValue({fieldId: nxtSkipFieldText.toString()});
                            while(nxtAprSkp) {
                                purchaseApprovalFlowObj.setValue({fieldId: nxtStatusFieldText, value: "2"});
                                nexeLevelCount++;
                                var nxtAprvrFieldText = "custrecord_approver_"+nexeLevelCount;
                                var nxtStatusFieldText = "custrecord_approval_status_"+nexeLevelCount;
                                var nxtSkipFieldText = "custrecord_approval_skip_"+nexeLevelCount;
                                nxtAprId = purchaseApprovalFlowObj.getValue({fieldId: nxtAprvrFieldText.toString()});
                                nxtAprSkp = purchaseApprovalFlowObj.getValue({fieldId: nxtSkipFieldText.toString()});
                            }
                            if(nxtAprId) {
                                purchaseApprovalFlowObj.setValue({fieldId: nxtStatusFieldText.toString(), value: "1"});
                                sendEmailTo.push(nxtAprId);
                                emailNxtLevelAtt.push(nexeLevelCount);
                            }
                        }
    
                        try {
    
                            var allStatues = [];
                            var stautsEmpId = '';
                            var pendAprvlLvl = '';
                            var prevApproverObj = {approvalLvl: [], approverIds: [], desig: [], approverNms: [], approvalStatus: []};
                            for(var ln=1;ln<=noOfLevels;ln++) {
                                var tempNextApproverField       = "custrecord_approver_"+ln;
                                var tempStatusFieldText = "custrecord_approval_status_"+ln;
                                var lvlStatus = purchaseApprovalFlowObj.getValue({fieldId: tempStatusFieldText.toString()});
                                if(!lvlStatus) {lvlStatus = "0";}
                                allStatues.push(lvlStatus);

                                if(purchaseApprovalFlowObj.getValue({fieldId: tempStatusFieldText.toString()}) == 1) {
                                    stautsEmpId = purchaseApprovalFlowObj.getValue({fieldId: tempNextApproverField.toString()});
                                    pendAprvlLvl = ln;
                                }

                                if(purchaseApprovalFlowObj.getValue({fieldId: tempStatusFieldText.toString()}) == 2) {
                                    prevApproverObj.approvalLvl.push(ln);
                                    prevApproverObj.approverIds.push(purchaseApprovalFlowObj.getValue({fieldId: tempNextApproverField.toString()}));
                                    prevApproverObj.desig.push("");
                                    prevApproverObj.approverNms.push("");
                                    prevApproverObj.approvalStatus.push(purchaseApprovalFlowObj.getText({fieldId: tempStatusFieldText.toString()}));
                                }
    
                            }//for(var ln=1;ln<=noOfLevels;ln++)
                            log.debug({title: "allStatues => ", details: allStatues});


                            var custPRApprovalStatus = '';
                            if(Number(pendAprvlLvl) >= Number(buStart) && Number(pendAprvlLvl) <= Number(buEnd)) {
                                custPRApprovalStatus = "Pending Approval from BU.";
                            }
                            else {
                                if(stautsEmpId) {
                                    var pendAprvlEmpObj = search.lookupFields({type:search.Type.EMPLOYEE, id: stautsEmpId, columns: ['custentity1']});
                                    //log.debug({title: "pendAprvlEmpObj", details: JSON.stringify(pendAprvlEmpObj)});
                                    if(pendAprvlEmpObj.custentity1[0]) {
                                        var empDesignation = pendAprvlEmpObj.custentity1[0].text;
                                        custPRApprovalStatus = "Pending Approval from "+empDesignation;
                                    }
                                }
                            }

                            var updatedPRId = purchaseApprovalFlowObj.save();
                            
                            if(updatedPRId) {
                                
                                var prevApproverTableString = _getApproverWithDesignTable(prevApproverObj);

                                log.debug({title: 'Purchase Approval Flow updated successfully.', details: updatedPRId});
                                log.debug({title: 'sendEmailTo.', details: sendEmailTo});
                                log.debug({title: 'emailNxtLevelAtt.', details: emailNxtLevelAtt});
                                
                                if(sendEmailTo.length > 0) {
                                    log.debug({title: "sendEmailTo => ", details: sendEmailTo});
                                    log.debug({title: "emailNxtLevelAtt => ", details: emailNxtLevelAtt});

                                    
                                    
                                    log.debug({title: "prevApproverObj => ", details: prevApproverObj});

                                    _pendingApprovalEmailTemplate(purchaseRequestId, updatedPRId, sendEmailTo, emailNxtLevelAtt, prevApproverTableString);
                                }
    
                                log.debug({title: "allStatues => ", details: allStatues});
                                
                                
                                    var poRecObj = record.load({type: 'purchaseorder', id: purchaseRequestId});
                                    var requesterId = '';
                                    var preparerId = '';
                                
                                    if(poRecObj) {
                                        if(allStatues.indexOf("1") < 0 && allStatues.indexOf("0") < 0) {
                                            poRecObj.setValue({fieldId: 'approvalstatus', value: 2});
                                            poRecObj.setValue({fieldId: 'custbody_pr_approval_status', value: "All Levels Approved."});
                                        }
                                        else {
                                            poRecObj.setValue({fieldId: 'custbody_pr_approval_status', value: custPRApprovalStatus});
                                        }
                                        poRecObj.save();
                                        if(allStatues.indexOf("1") < 0 && allStatues.indexOf("0") < 0) {
                                            _sendAllApprovedEmail(purchaseRequestId, poRecObj, prevApproverTableString);
                                        }
                                    }
                                
    
                            }//if(updatedPRId)
        
                            
                        }
                        catch(err) {
                            log.debug({title: "Error Encountered during Purchase Approval Flow Update", details: err});
                        }
    
                    }
    
                    var submitField = form.addField({id: 'custpage_submit', type: ui.FieldType.INLINEHTML, label: ' '});
                    submitField.defaultValue = "<script>setTimeout(function() { document.getElementById('main_form').submit(); }, 800);</script>"
                    //submitField.updateDisplayType({displayType: ui.FieldDisplayType.INLINEHTML});
    
                }
            }

        }//if(purchaseRequestId && purchaseApprFlowId && nexeLevelCount)


    }

    function _rejectFunctionality(context, requestObj, form, purchaseRequestId, purchaseApprFlowId, nexeLevelCount, fromRecordFlag) {

        var purchaseRequestStatus = search.lookupFields({type: 'purchaseorder', id: purchaseRequestId, columns: ['approvalstatus']});
        var proceedFlag = true;
        form.title = "PR Rejection";
        if(purchaseRequestStatus.approvalstatus[0]) {
            if(purchaseRequestStatus.approvalstatus[0].value == 3) {

                var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                var defaultText = '<center><font size="5" face="arial">This Purchase Request is already rejected and not in use any more. Thank you.</font></center>';
                
                if(fromRecordFlag) {
                    //Show Back button
                    defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/purchord.nl?id='+purchaseRequestId+'">View PR</a></font></center>';
                }
                
                msgFld.defaultValue = defaultText;
                proceedFlag = false;
            }
            else if(purchaseRequestStatus.approvalstatus[0].value == 1 || purchaseRequestStatus.approvalstatus[0].value == 2) {
                var prAfObj = record.load({type: 'customrecord_pr_approval_flow', id: purchaseApprFlowId});
                
                if(prAfObj) {
                    var statusFieldText = "custrecord_approval_status_"+nexeLevelCount;
                    var prAfStatusValue = prAfObj.getValue({fieldId: statusFieldText.toString()});
                    
                    if(prAfStatusValue == 2) {
                        var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                        var defaultText = '<center><font size="5" face="arial">This Purchase Request is already approved. Thank you.</font></center>';
                        proceedFlag = false;
                        msgFld.defaultValue = defaultText;
                    }
                    else if(prAfStatusValue == 3) {
                        var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                        var defaultText = '<center><font size="5" face="arial">This Purchase Request is already rejected. Thank you.</font></center>';
                        proceedFlag = false;
                        msgFld.defaultValue = defaultText;
                    }
                    

                }
            }
        }

        if(proceedFlag) {

            var reasonField = form.addField({id: 'custpage_reason', type: ui.FieldType.TEXTAREA, label: 'Rejection Reason'});
            reasonField.isMandatory = true;
    
            var purchaseRequesField          = form.addField({id: 'custpage_pr_id', type: ui.FieldType.SELECT, label: 'Purchase Request', source: 'transaction'});
            var purchApproveFlowField        = form.addField({id: 'custpage_praf_id', type: ui.FieldType.SELECT, label: 'Purchase Approval Flow', source: 'customrecord_pr_approval_flow'});
            var nextLevelField               = form.addField({id: 'custpage_nxt_lvl', type:ui.FieldType.TEXT, label: 'Next Level'});
           
            purchaseRequesField.defaultValue = purchaseRequestId;
            purchApproveFlowField.defaultValue = purchaseApprFlowId;
            nextLevelField.defaultValue = nexeLevelCount;
    
            purchaseRequesField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
            purchApproveFlowField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
            nextLevelField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
    
            form.addSubmitButton({label: 'Confirm Reject'});
    
        }

    }

    function _cancelFunctionality(context, requestObj, form, purchaseRequestId, purchaseApprFlowId) {
        
        var reasonField = form.addField({id: 'custpage_reason', type: ui.FieldType.TEXTAREA, label: 'Cancel Reason'});
        reasonField.isMandatory = true;
        form.title = "PR Cancellation";
        var purchaseRequesField          = form.addField({id: 'custpage_pr_id', type: ui.FieldType.SELECT, label: 'Purchase Request', source: 'transaction'});
        var purchApproveFlowField        = form.addField({id: 'custpage_praf_id', type: ui.FieldType.SELECT, label: 'Purchase Approval Flow', source: 'customrecord_pr_approval_flow'});
            
        purchaseRequesField.defaultValue = purchaseRequestId;
        purchApproveFlowField.defaultValue = purchaseApprFlowId;

        purchaseRequesField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
        purchApproveFlowField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
       
        form.addSubmitButton({label: 'Confirm Cancel'});

    }

    function _sendNotificationFunctionality(context, requestObj, form, purchaseRequestId, purchaseApprFlowId) {

        if(purchaseRequestId && purchaseApprFlowId) {

            var sendEmailTo = [];
            var emailNxtLevelAtt = [];
            var purchaseApprovalFlowObj = record.load({type: 'customrecord_pr_approval_flow', id: purchaseApprFlowId});

            if(purchaseApprovalFlowObj) {
                
                var noOfLevels = purchaseApprovalFlowObj.getValue({fieldId: 'custrecord_no_of_level'});
                var prevApproverObj = {approvalLvl: [], approverIds: [], desig: [], approverNms: [], approvalStatus: []};

                for(var i=1;i<=noOfLevels;i++) {
                    
                    var statusFieldText = 'custrecord_approval_status_'+i;
                    var approverFieldText = 'custrecord_approver_'+i;

                    var tempStatus = purchaseApprovalFlowObj.getValue({fieldId: statusFieldText.toString()});
                    var tempApprover = purchaseApprovalFlowObj.getValue({fieldId: approverFieldText.toString()});

                    if(tempStatus == 1) {
                        if(tempApprover) {
                            sendEmailTo.push(tempApprover);
                            emailNxtLevelAtt.push(i);
                        }
                    }
                    if(purchaseApprovalFlowObj.getValue({fieldId: statusFieldText.toString()}) == 2) {
                        prevApproverObj.approvalLvl.push(i);
                        prevApproverObj.approverIds.push(purchaseApprovalFlowObj.getValue({fieldId: approverFieldText.toString()}));
                        prevApproverObj.desig.push("");
                        prevApproverObj.approverNms.push("");
                        prevApproverObj.approvalStatus.push(purchaseApprovalFlowObj.getText({fieldId: statusFieldText.toString()}));
                    }
                }//for(var i=1;i<=noOfLevels;i++)
                log.debug({title: "Send Email To", details: sendEmailTo});
                log.debug({title: "Send Email To Level", details: emailNxtLevelAtt});
                if(sendEmailTo.length > 0) {
                    
                    var prevApproverTableString = _getApproverWithDesignTable(prevApproverObj);
                    log.debug({title: "prevApproverObj => ", details: prevApproverObj});
                    _pendingApprovalEmailTemplate(purchaseRequestId, purchaseApprFlowId, sendEmailTo, emailNxtLevelAtt, prevApproverTableString);
                }
                context.response.write({output: "true"});
            }

        }

    }

    function _billRejectionFunctionality(billId, form, fromRecordFlag) {

        form.title = "Bill Rejection";
        var proceedFlag = true;

        try {
            var billRecObj = record.load({type: 'vendorbill', id: billId});
            var billApprovalStatus = '';
            if(billRecObj) {billApprovalStatus = billRecObj.getValue({fieldId: 'approvalstatus'}); }
            log.debug({title: "Vendor Bill Status", details: billApprovalStatus});
            if(billApprovalStatus == 2) {
                var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                var defaultText = '<center><font size="5" face="arial">You have already approved this Vendor Bill. Thank you.</font></center>';
                
                if(fromRecordFlag) {
                    //Show Back button
                    defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+billId+'">View Bill</a></font></center>';
                }
                
                msgFld.defaultValue = defaultText;
                proceedFlag = false;
            }
            else if(billApprovalStatus == 3) {
                var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                var defaultText = '<center><font size="5" face="arial">You have already rejected this Vendor Bill. Thank you.</font></center>';
                
                if(fromRecordFlag) {
                    //Show Back button
                    defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+billId+'">View Bill</a></font></center>';
                }
                
                msgFld.defaultValue = defaultText;
                proceedFlag = false;
            }

            if(proceedFlag) {
                if(billId) {
                    var reasonField = form.addField({id: 'custpage_reason', type: ui.FieldType.TEXTAREA, label: 'Rejection Reason'});
                    reasonField.isMandatory = true;
                    var submitBtn = form.addSubmitButton({label: 'Confirm Reject'});
                }//if(billId)
            }

        

        }
        catch(err) {
            log.debug({title: 'Error Rejecting Vendor Bill : '+billId, details: err});
        }

    }//function _billRejectionFunctionality(billId, form)

    function _pendingApprovalEmailTemplate(purchaseRequestId, updatedPRId, sendEmailTo, emailNxtLevelAtt, prevApproverTableString) {

        //Procurement, Zume Inc 60252
        //var fileObj = render.transaction({entityId: Number(purchaseRequestId), printMode: render.PrintMode.PDF, isCustLocale: true});
        
        var poTableString = "";
        var currentScriptId = runtime.getCurrentScript().id;
        var currentScriptDeploumentId = runtime.getCurrentScript().deploymentId;
        var suiteletURL = url.resolveScript({scriptId: currentScriptId, deploymentId: currentScriptDeploumentId, returnExternalUrl: true});
        
        var prObj = record.load({type: 'purchaseorder', id: purchaseRequestId});
        var tranIdText = '', requestorName = '', preparerName = '', vendorName  = '', totalAmount = '', departnmentName = '', className = '', ordrNoteFldVal = '', internalCommentsVal = '';
        if(prObj) {
            tranIdText = prObj.getValue({fieldId: 'tranid'});
            requestorName = prObj.getText({fieldId: 'custbody_requestor'});
            preparerName = prObj.getText({fieldId: 'employee'});
            vendorName = prObj.getText({fieldId: 'entity'});
            totalAmount = prObj.getValue({fieldId: 'total'});
            departnmentName = prObj.getText({fieldId: 'department'});
            className = prObj.getText({fieldId: 'class'});
            ordrNoteFldVal = prObj.getText({fieldId: 'custbody2'});
            internalCommentsVal = prObj.getText({fieldId: 'custbody_internal_comments'});
            totalAmount = Number(totalAmount).toFixed(2);
            poTableString += _getItemAndExpenseTable(prObj) ;

        }
        var fileObjs = [];

        fileObjs = _getPOAttachments(purchaseRequestId);

        var emailSubject = "Purchase Request for Purchase Order No. "+tranIdText + " has been submitted for your approval.";
        for(var s=0;s<sendEmailTo.length;s++) {
            var bodyString = "";
            var emailToId = sendEmailTo[s];
            var nextLevel = emailNxtLevelAtt[s];
            var userName = 'User';
            var empObj = search.lookupFields({type: search.Type.EMPLOYEE, id: emailToId, columns: ["firstname", "lastname"]});
            if(empObj) {
                log.debug({title: "empObj", details: JSON.stringify(empObj)});
                var firstName = empObj.firstname;
                var lastName = empObj.lastname;
                userName = firstName + " " + lastName;
            }

            //var param = {processFlag: 'a', prAfId: prAfId, recId: recId, nextLevel: nextLevel, fromrec: "1"};

            var approveURLParam = suiteletURL + '&processFlag=a&prAfId='+getEncodedValue(updatedPRId)+'&recId='+getEncodedValue(purchaseRequestId)+'&nextLevel='+getEncodedValue(nextLevel);
            var rejectURLParam = suiteletURL + '&processFlag=r&prAfId='+getEncodedValue(updatedPRId)+'&recId='+getEncodedValue(purchaseRequestId)+'&nextLevel='+getEncodedValue(nextLevel);

            bodyString += " <html>";
            bodyString += "     <body>";
            bodyString += "         Hello "+userName+",<br/><br/>You have received a new Purchase Request for approval.";
            bodyString += "         <br/>";
            
            bodyString += "         <table>";
            bodyString += "         <tr><td>Purchase Request for</td><td>:</td><td>Purchase Order Number "+tranIdText+"</td></tr>";
            bodyString += "         <tr><td>Requestor</td><td>:</td><td>"+requestorName+"</td></tr>";
            bodyString += "         <tr><td>Preparer</td><td>:</td><td>"+preparerName+"</td></tr>";
            bodyString += "         <tr><td>Vendor</td><td>:</td><td>"+vendorName+"</td></tr>";
            bodyString += "         <tr><td>Total Amount</td><td>:</td><td>$"+totalAmount+"</td></tr>";
            bodyString += "         <tr><td>Department</td><td>:</td><td>"+departnmentName+"</td></tr>";
            bodyString += "         <tr><td>Class</td><td>:</td><td>"+className+"</td></tr>";
            bodyString += "         </table>";
            bodyString += "         <br/><br/>";
            bodyString += poTableString;
            
            if(prevApproverTableString) {
                bodyString += "         <br/><br/><p><b>Approval Detail(s):</b></p><br/>";
                bodyString += prevApproverTableString;
                bodyString += "         <br/><br/>";
            }
            
            
            bodyString += "         ORDER NOTES FIELD(TO BE PRINTED): "+ordrNoteFldVal;
            bodyString += "         <br/>";
            bodyString += "         INTERNAL COMMENTS: "+internalCommentsVal;
            bodyString += "         <br/><br/>";

            //bodyString += "         Attached PDF is snapshot of PR.<br/>";
            bodyString += "         Please use buttons below to either <i><b>Approve</b></i> or <i><b>Reject</b></i> the Purchase Request.";
            bodyString += "         <br/><br/>";
            bodyString += "         <b>Note:</b> Upon rejection the system will ask for you for a reason for the rejection.";

            bodyString += "         <br/><br/>";
            bodyString += "         <a href='"+approveURLParam+"'><img src='https://4879077-sb2.app.netsuite.com/core/media/media.nl?id=22152&c=4879077_SB2&h=9b1dfbb416b36a702a24&expurl=T' border='0' alt='Accept' style='width: 60px;'/></a>";
            bodyString += "         <a href='"+rejectURLParam+"'><img src='https://4879077-sb2.app.netsuite.com/core/media/media.nl?id=22151&c=4879077_SB2&h=65142f106e82b6703fdb&expurl=T' border='0' alt='Reject' style='width: 60px;'/></a>";
            bodyString += "         <br/>If you have any questions, please email ap@zume.com and reference the Purchase Order Number from above.";
            bodyString += "         <br/><br/>Thank you<br/>Zume Purchasing Team";
            bodyString += "     </body>";
            bodyString += " </html>";
            
            var emailObj = email.send({
                author: 60252,
                recipients: emailToId,
                subject: emailSubject,
                body: bodyString,
                //relatedRecords: {transactionId: Number(purchaseRequestId)},
                attachments: fileObjs
            });
        }
    }

    function _sendRejectionEmail(purchaseRequestId, requestorId, preparerId, reasonText, prevApproverTableString) {
        //Procurement, Zume Inc 60252
        //var fileObj = render.transaction({entityId: Number(purchaseRequestId), printMode: render.PrintMode.PDF, isCustLocale: true});
        var bodyString = "";
        var poTableString = "";
        var userName    = "User";
        
        var empObj = search.lookupFields({type: search.Type.EMPLOYEE, id: requestorId, columns: ["firstname", "lastname"]});
        if(empObj) {
            log.debug({title: "empObj", details: JSON.stringify(empObj)});
            var firstName = empObj.firstname;
            var lastName = empObj.lastname;
            userName = firstName + " " + lastName;
        }

        var empObj1 = search.lookupFields({type: search.Type.EMPLOYEE, id: preparerId, columns: ["firstname", "lastname"]});
        if(empObj1) {
            log.debug({title: "empObj", details: JSON.stringify(empObj1)});
            var firstName = empObj.firstname;
            var lastName = empObj.lastname;
            userName = "/" + firstName + " " + lastName;
        }

        var prObj = record.load({type: 'purchaseorder', id: purchaseRequestId});
        var tranIdText = '', requestorName = '', preparerName = '', vendorName  = '', totalAmount = '', departnmentName = '', className = '';
        if(prObj) {
            tranIdText = prObj.getValue({fieldId: 'tranid'});
            requestorName = prObj.getText({fieldId: 'custbody_requestor'});
            preparerName = prObj.getText({fieldId: 'employee'});
            vendorName = prObj.getText({fieldId: 'entity'});
            totalAmount = prObj.getValue({fieldId: 'total'});
            departnmentName = prObj.getText({fieldId: 'department'});
            className = prObj.getText({fieldId: 'class'});
            totalAmount = Number(totalAmount).toFixed(2);
            poTableString += _getItemAndExpenseTable(prObj) ;
        }
        
        var emailSubject = "Purchase Request for Purchase Order "+tranIdText + " has been Rejected.";

        bodyString += " <html>";
            bodyString += "     <body>";
            bodyString += "         Hello "+userName+",<br/><br/>Your Purcahse Request for Purchase Order "+tranIdText+" has been rejected.";
            bodyString += "         <br/>";
            
            bodyString += "         <table>";
            bodyString += "         <tr><td>PR Number</td><td>:</td><td>"+tranIdText+"</td></tr>";
            bodyString += "         <tr><td><b>Reason</b></td><td>:</td><td><b>"+reasonText+"</b></td></tr>";
            bodyString += "         <tr><td>Requestor</td><td>:</td><td>"+requestorName+"</td></tr>";
            bodyString += "         <tr><td>Preparer</td><td>:</td><td>"+preparerName+"</td></tr>";
            bodyString += "         <tr><td>Vendor</td><td>:</td><td>"+vendorName+"</td></tr>";
            bodyString += "         <tr><td>Total Amount</td><td>:</td><td>$"+totalAmount+"</td></tr>";
            bodyString += "         <tr><td>Department</td><td>:</td><td>"+departnmentName+"</td></tr>";
            bodyString += "         <tr><td>Class</td><td>:</td><td>"+className+"</td></tr>";
            bodyString += "         </table>";
            bodyString += "         <br/><br/>";
            bodyString += poTableString;

            if(prevApproverTableString) {
                bodyString += "         <br/><br/><p><b>Approval Detail(s):</b></p><br/>";
                bodyString += prevApproverTableString;
                bodyString += "         <br/><br/>";
            }

            bodyString += "Please see the reason for the rejection above. If you have any questions about the rejection, please connect directly with the person who rejected the Purchase Request.";
            bodyString += "For any other questions, please email ap@zume.com and reference the Purchase Order Number from above.";
            
            //bodyString += "         Attached PDF is snapshot of PR.";
            bodyString += "         <br/><br/>Thank you<br/>Zume Purchasing Team";
            bodyString += "     </body>";
            bodyString += " </html>";

        var fileObjs = [];

        fileObjs = _getPOAttachments(purchaseRequestId);


        var emailObj = email.send({
                author: 60252,
                recipients: [requestorId, preparerId],
                subject: emailSubject,
                body: bodyString,
                //relatedRecords: {transactionId: Number(purchaseRequestId)},
                attachments: fileObjs
            });
        
    }

    function _sendCancelEmail(purchaseRequestId, requestorId, preparerId, reasonText, prevApproverTableString) {
        
        //Procurement, Zume Inc 60252
        //var fileObj = render.transaction({entityId: Number(purchaseRequestId), printMode: render.PrintMode.PDF, isCustLocale: true});
        var bodyString = "";
        var poTableString = "";
        var userName    = "User";
        
        var prObj = record.load({type: 'purchaseorder', id: purchaseRequestId});
        var tranIdText = '', requestorName = '', preparerName = '', vendorName  = '', totalAmount = '', departnmentName = '', className = '';
        if(prObj) {
            tranIdText = prObj.getValue({fieldId: 'tranid'});
            requestorName = prObj.getText({fieldId: 'custbody_requestor'});
            preparerName = prObj.getText({fieldId: 'employee'});
            vendorName = prObj.getText({fieldId: 'entity'});
            totalAmount = prObj.getValue({fieldId: 'total'});
            departnmentName = prObj.getText({fieldId: 'department'});
            className = prObj.getText({fieldId: 'class'});
            totalAmount = Number(totalAmount).toFixed(2);
            poTableString += _getItemAndExpenseTable(prObj) ;
        }

        var empObj = search.lookupFields({type: search.Type.EMPLOYEE, id: requestorId, columns: ["firstname"]});
        if(empObj) {
            log.debug({title: "empObj", details: JSON.stringify(empObj)});
            userName = empObj.firstname;
        }

        var empObj1 = search.lookupFields({type: search.Type.EMPLOYEE, id: preparerId, columns: ["firstname"]});
        if(empObj1) {
            log.debug({title: "empObj", details: JSON.stringify(empObj1)});
            userName += "/"+empObj1.firstname;
        }
        
        var emailSubject = "PR #"+tranIdText + " has been Cancelled.";
        bodyString += " <html>";
        bodyString += "     <body>";
        bodyString += "         Dear "+userName+",<br/><br/>Your PR #"+tranIdText+" has been Cancelled.";
        bodyString += "         <br/>";
        
        bodyString += "         <table>";
        bodyString += "         <tr><td>PR Number</td><td>:</td><td>"+tranIdText+"</td></tr>";
        bodyString += "         <tr><td>Reason</td><td>:</td><td>"+reasonText+"</td></tr>";
        bodyString += "         <tr><td>Requester</td><td>:</td><td>"+requestorName+"</td></tr>";
        bodyString += "         <tr><td>Preparer</td><td>:</td><td>"+preparerName+"</td></tr>";
        bodyString += "         <tr><td>Vendor</td><td>:</td><td>"+vendorName+"</td></tr>";
        bodyString += "         <tr><td>Total Amount</td><td>:</td><td>"+totalAmount+"</td></tr>";
        bodyString += "         <tr><td>Department</td><td>:</td><td>"+departnmentName+"</td></tr>";
        bodyString += "         <tr><td>Class</td><td>:</td><td>"+className+"</td></tr>";
        bodyString += "         </table>";
        bodyString += "         <br/><br/>";
        bodyString += poTableString;

        if(prevApproverTableString) {
            bodyString += "         <br/><br/><p><b>Approval Detail(s):</b></p><br/>";
            bodyString += prevApproverTableString;
            bodyString += "         <br/><br/>";
        }
        
        //bodyString += "         Attached PDF is snapshot of PR.";
        bodyString += "         <br/><br/>Thank you<br/>Admin";
        bodyString += "     </body>";
        bodyString += " </html>";

        var fileObjs = [];

        fileObjs = _getPOAttachments(purchaseRequestId);


        var emailObj = email.send({
                author: 60252,
                recipients: [requestorId, preparerId],
                subject: emailSubject,
                body: bodyString,
                //relatedRecords: {transactionId: Number(purchaseRequestId)},
                attachments: fileObjs
            });

    }

    function _sendAllApprovedEmail(purchaseRequestId, poRecObj, prevApproverTableString) {

        var fileObj = render.transaction({entityId: Number(purchaseRequestId), printMode: render.PrintMode.PDF, isCustLocale: true});
        var bodyString = "";
        var poTableString = "";
        var userName    = "User";
        
       var tranIdText = '', requestorId = '', requestorName = '', preparerId = '', preparerName = '', vendorName  = '', totalAmount = '', departnmentName = '', className = '';
        if(poRecObj) {
            tranIdText = poRecObj.getValue({fieldId: 'tranid'});
            requestorId = poRecObj.getValue({fieldId: 'custbody_requestor'});
            requestorName = poRecObj.getText({fieldId: 'custbody_requestor'});
            preparerId = poRecObj.getValue({fieldId: 'employee'});
            preparerName = poRecObj.getText({fieldId: 'employee'});
            vendorName = poRecObj.getText({fieldId: 'entity'});
            totalAmount = poRecObj.getValue({fieldId: 'total'});
            departnmentName = poRecObj.getText({fieldId: 'department'});
            className = poRecObj.getText({fieldId: 'class'});
            totalAmount = Number(totalAmount).toFixed(2);
            poTableString += _getItemAndExpenseTable(poRecObj) ;
        }
        
        var empObj = search.lookupFields({type: search.Type.EMPLOYEE, id: requestorId, columns: ["firstname", "lastname"]});
        if(empObj) {
            log.debug({title: "empObj", details: JSON.stringify(empObj)});
            var firstName = empObj.firstname;
            var lastName = empObj.lastname;
            userName = firstName + " " + lastName;
        }

        var empObj1 = search.lookupFields({type: search.Type.EMPLOYEE, id: preparerId, columns: ["firstname", "lastname"]});
        if(empObj1) {
            log.debug({title: "empObj", details: JSON.stringify(empObj1)});
            var firstName = empObj.firstname;
            var lastName = empObj.lastname;
            userName = "/"+firstName + " " + lastName;
        }
        
        var emailSubject = "Purchase Order #"+tranIdText + " has been approved.";
        bodyString += " <html>";
        bodyString += "     <body>";
        bodyString += "         Dear "+userName+",<br/><br/>Your PR #"+tranIdText+" has been approved.";
        bodyString += "         <br/>";
        
        bodyString += "         <table>";
        bodyString += "         <tr><td>Purchase Order Number</td><td>:</td><td>"+tranIdText+"</td></tr>";
        bodyString += "         <tr><td>Requestor</td><td>:</td><td>"+requestorName+"</td></tr>";
        bodyString += "         <tr><td>Preparer</td><td>:</td><td>"+preparerName+"</td></tr>";
        bodyString += "         <tr><td>Vendor</td><td>:</td><td>"+vendorName+"</td></tr>";
        bodyString += "         <tr><td>Total Amount</td><td>:</td><td>$"+totalAmount+"</td></tr>";
        bodyString += "         <tr><td>Department</td><td>:</td><td>"+departnmentName+"</td></tr>";
        bodyString += "         <tr><td>Class</td><td>:</td><td>"+className+"</td></tr>";
        bodyString += "         </table>";
        bodyString += "         <br/><br/>";
        bodyString += poTableString;
        
        if(prevApproverTableString) {
            bodyString += "         <br/><br/><p><b>Approval Detail(s):</b></p><br/>";
            bodyString += prevApproverTableString;
            bodyString += "         <br/><br/>";
        }

        bodyString += "As a next step, please send the Purchase Order to your vendor.";
        bodyString += "Please ensure they add the PO Number on the invoice and send the invoice directly to ap@zume.com.";
        bodyString += "<br/>";
        bodyString += "For any other questions, please email ap@zume.com and reference the Purchase Order Number from above.";

        //bodyString += "         Attached PDF is snapshot of PR.";
        bodyString += "         <br/><br/>Thank you<br/>Zume Purchasing Team";
        bodyString += "     </body>";
        bodyString += " </html>";
        var fileObjs = [];

        fileObjs = _getPOAttachments(purchaseRequestId);

        if(fileObj) {
            fileObjs.push(fileObj);
        }

        var emailObj = email.send({
                author: 60252,
                recipients: [requestorId, preparerId],
                subject: emailSubject,
                body: bodyString,
                //relatedRecords: {transactionId: Number(purchaseRequestId)},
                attachments: fileObjs
            });

    }

    function _sendBillApprovedEmailToCreator(billId, tranIdText, requestorName, customApproverId, preparerName, billCreatorId, vendorName, totalAmount, poTableString) {
            
            var emailSubject = "Bill #"+tranIdText + " has been Approved.";
        
            var emailToId = billCreatorId;
            var userName = 'User';
            if(preparerName) {
                userName = preparerName
            }
            var bodyString = "";
            bodyString += " <html>";
            bodyString += "     <body>";
            bodyString += "         Dear "+userName+",<br/><br/>Bill #"+tranIdText+" is approved.<br/>";
            bodyString += "         <br/>";
            
            bodyString += "         <table>";
            bodyString += "         <tr><td>Bill Number</td><td>:</td><td>"+tranIdText+"</td></tr>";
            bodyString += "         <tr><td>Approver</td><td>:</td><td>"+requestorName+"</td></tr>";
            bodyString += "         <tr><td>Creator</td><td>:</td><td>"+preparerName+"</td></tr>";
            bodyString += "         <tr><td>Vendor</td><td>:</td><td>"+vendorName+"</td></tr>";
            bodyString += "         <tr><td>Total Amount</td><td>:</td><td>"+totalAmount+"</td></tr>";
            //bodyString += "         <tr><td>Department</td><td>:</td><td>"+departnmentName+"</td></tr>";
            //bodyString += "         <tr><td>Class</td><td>:</td><td>"+className+"</td></tr>";
            bodyString += "         </table>";
            bodyString += "         <br/><br/>";
            bodyString += poTableString;
            bodyString += "         <br/><br/>";
            /*bodyString += "         Attached PDF is snapshot of PR.<br/>";
            bodyString += "         Please use below buttons to either <i><b>Approve</b></i> or <i><b>Reject</b></i> Bill.";
            bodyString += "         <br/><br/>";
            bodyString += "         <b>Note:</b> Upon rejection system will ask for 'Reason for Rejection'.";

            bodyString += "         <br/><br/>";

            bodyString += "         <a href='"+approveURLParam+"'><img src='https://4879077-sb2.app.netsuite.com/core/media/media.nl?id=22152&c=4879077_SB2&h=9b1dfbb416b36a702a24&expurl=T' border='0' alt='Accept' style='width: 60px;'/></a>";
            bodyString += "         <a href='"+rejectURLParam+"'><img src='https://4879077-sb2.app.netsuite.com/core/media/media.nl?id=22151&c=4879077_SB2&h=65142f106e82b6703fdb&expurl=T' border='0' alt='Reject' style='width: 60px;'/></a>";*/
            bodyString += "         <br/><br/>Thank you<br/>Admin";
            bodyString += "     </body>";
            bodyString += " </html>";
            
            var emailObj = email.send({
                author: 60252,
                recipients: emailToId,
                subject: emailSubject,
                body: bodyString,
                //relatedRecords: {transactionId: Number(billId)}
            });
    }

    function _sendBillRejectEmailToCreator(billId, tranIdText, requestorName, customApproverId, preparerName, billCreatorId, vendorName, totalAmount, reasonText, poTableString) {
        
        var emailSubject = "Bill #"+tranIdText + " has been Rejected.";
        
        var emailToId = billCreatorId;
        var userName = 'User';
        if(preparerName) {
            userName = preparerName
        }
        var bodyString = "";
        bodyString += " <html>";
        bodyString += "     <body>";
        bodyString += "         Dear "+userName+",<br/><br/>Bill #"+tranIdText+" is Rejected.<br/>";
        bodyString += "         <br/>";
        
        bodyString += "         <table>";
        bodyString += "         <tr><td>Bill Number</td><td>:</td><td>"+tranIdText+"</td></tr>";
        bodyString += "         <tr><td>Reason</td><td>:</td><td>"+reasonText+"</td></tr>";
        bodyString += "         <tr><td>Approver</td><td>:</td><td>"+requestorName+"</td></tr>";
        bodyString += "         <tr><td>Creator</td><td>:</td><td>"+preparerName+"</td></tr>";
        bodyString += "         <tr><td>Vendor</td><td>:</td><td>"+vendorName+"</td></tr>";
        bodyString += "         <tr><td>Total Amount</td><td>:</td><td>"+totalAmount+"</td></tr>";
        //bodyString += "         <tr><td>Department</td><td>:</td><td>"+departnmentName+"</td></tr>";
        //bodyString += "         <tr><td>Class</td><td>:</td><td>"+className+"</td></tr>";
        bodyString += "         </table>";
        bodyString += "         <br/><br/>";
        bodyString += poTableString;
        bodyString += "         <br/><br/>";
        bodyString += "         <br/><br/>Thank you<br/>Admin";
        bodyString += "     </body>";
        bodyString += " </html>";
        
        var emailObj = email.send({
            author: 60252,
            recipients: emailToId,
            subject: emailSubject,
            body: bodyString,
            //relatedRecords: {transactionId: Number(billId)}
        });
    }

    function _getItemAndExpenseTable(prObj) {
        var poTableString = "";

        var itemTotalAmount = 0.00;
            var expenseTotalAmount = 0.00;
            var poItemLnCount = prObj.getLineCount({sublistId: 'item'});
                if(Number(poItemLnCount) > 0) {
                    poTableString += "<p><h2>Items:</h2></p>";
                    poTableString += "<table border= '1' cellspacing='0' cellpadding='5'>";
                        poTableString += "<tr>";
                            poTableString += "  <th><center><b>Sr.No.</b></center></th>";
                            poTableString += "  <th><center><b>Item</b></center></th>";
                            poTableString += "  <th><center><b>Department</b></center></th>";
                            poTableString += "  <th><center><b>Class</b></center></th>";
                            poTableString += "  <th><center><b>Description</b></center></th>";
                            poTableString += "  <th><center><b>Quantity</b></center></th>";
                            poTableString += "  <th><center><b>Rate</b></center></th>";
                            poTableString += "  <th><center><b>Amount</b></center></th>";
                        poTableString += "</tr>";

                        for(var it=0;it<poItemLnCount;it++) {
                            
                            var srNo = Number(it) + 1;
                            var itemName        = prObj.getSublistText({sublistId: 'item', fieldId: 'item', line: it});
                            var lnDepartmentNam = prObj.getSublistText({sublistId: 'item', fieldId: 'department', line: it});
                            var lnClassNm       = prObj.getSublistText({sublistId: 'item', fieldId: 'class', line: it});
                            var lnDescptn       = prObj.getSublistText({sublistId: 'item', fieldId: 'description', line: it});
                            var itemQty         = prObj.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: it});
                            var itemRate        = prObj.getSublistValue({sublistId: 'item', fieldId: 'rate', line: it});
                            var itemAmt         = prObj.getSublistValue({sublistId: 'item', fieldId: 'amount', line: it});
                            itemRate = Number(itemRate).toFixed(2);
                            itemAmt = Number(itemAmt).toFixed(2);
                            itemTotalAmount = Number(itemTotalAmount) + Number(itemAmt);

                            poTableString += "<tr>";
                                poTableString += "  <td align=\"center\">"+srNo+"</td>";
                                poTableString += "  <td align=\"left\">"+itemName+"</td>";
                                poTableString += "  <td align=\"lett\">"+lnDepartmentNam+"</td>";
                                poTableString += "  <td align=\"left\">"+lnClassNm+"</td>";
                                poTableString += "  <td align=\"left\">"+lnDescptn+"</td>";
                                poTableString += "  <td align=\"center\">"+itemQty+"</td>";
                                poTableString += "  <td align=\"right\">$"+itemRate+"</td>";
                                poTableString += "  <td align=\"right\">$"+itemAmt+"</td>";
                            poTableString += "</tr>";

                        }//for(var it=0;it<poItemLnCount;it++)

                        itemTotalAmount = Number(itemTotalAmount).toFixed(2);

                        poTableString += "<tr>";
                            poTableString += "  <td align=\"right\" colspan=\"7\"><b>Total</b></td>";
                            poTableString += "  <td align=\"right\"><b>$"+itemTotalAmount+"</b></td>";
                        poTableString += "</tr>";
                    poTableString += "</table>";
                }//if(Number(poItemLnCount) > 0)
                poTableString += "<br/>";
                var poExpenseLnCount = prObj.getLineCount({sublistId: 'expense'}); 
                if(Number(poExpenseLnCount) > 0) {
                    poTableString += "<p><h2>Expenses:</h2></p>";
                    poTableString += "<table border= '1' cellspacing='0' cellpadding='5'>";
                        poTableString += "<tr>";
                            poTableString += "  <th><center><b>Sr.No.</b></center></th>";
                            poTableString += "  <th><center><b>Category</b></center></th>";
                            poTableString += "  <th><center><b>Account</b></center></th>";
                            poTableString += "  <th><center><b>Department</b></center></th>";
                            poTableString += "  <th><center><b>Class</b></center></th>";
                            poTableString += "  <th><center><b>Amount</b></center></th>";
                        poTableString += "</tr>";

                        for(var xp=0;xp<poExpenseLnCount;xp++) {
                            
                            var xpSrNo = Number(xp) + 1;
                            var categoryName        = prObj.getSublistText({sublistId: 'expense', fieldId: 'category', line: xp});
                            var acocuntName = prObj.getSublistText({sublistId: 'expense', fieldId: 'account', line: xp});
                            var expDepartmentNam = prObj.getSublistText({sublistId: 'expense', fieldId: 'department', line: xp});
                            var expClassNam       = prObj.getSublistText({sublistId: 'expense', fieldId: 'class', line: xp});
                            var expAmount         = prObj.getSublistValue({sublistId: 'expense', fieldId: 'amount', line: xp});
                            expAmount = Number(expAmount).toFixed(2);
                            expenseTotalAmount = Number(expenseTotalAmount) + Number(expAmount);
                            log.debug({title: "expenseTotalAmount", details: expenseTotalAmount});
                            poTableString += "<tr>";
                                poTableString += "  <td align=\"center\">"+xpSrNo+"</td>";
                                poTableString += "  <td align=\"left\">"+categoryName+"</td>";
                                poTableString += "  <td align=\"lett\">"+acocuntName+"</td>";
                                poTableString += "  <td align=\"left\">"+expDepartmentNam+"</td>";
                                poTableString += "  <td align=\"center\">"+expClassNam+"</td>";
                                poTableString += "  <td align=\"right\">"+expAmount+"</td>";
                            poTableString += "</tr>";

                        }//for(var it=0;it<poItemLnCount;it++)

                        expenseTotalAmount = Number(expenseTotalAmount).toFixed(2);

                        poTableString += "<tr>";
                            poTableString += "  <td align=\"right\" colspan=\"5\"><b>Total</b></td>";
                            poTableString += "  <td align=\"right\"><b>"+expenseTotalAmount+"</b></td>";
                        poTableString += "</tr>";
                    poTableString += "</table>";
                }//if(Number(poItemLnCount) > 0)

        return poTableString;
    }

    
    function getEncodedValue(tempString) {
        var encodedValue = encode.convert({
            string: tempString.toString(),
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64_URL_SAFE        
        });

        return encodedValue.toString();
    }

    function getDecodedValue(tempString) {
        
        var decodedValue = encode.convert({
            string: tempString.toString(),
            inputEncoding: encode.Encoding.BASE_64_URL_SAFE,
            outputEncoding: encode.Encoding.UTF_8      
        });

        return decodedValue.toString();
    }

    function _getApproverWithDesignTable(prevApproverObj) {
    
        var tempString = "";
    
        if(prevApproverObj.approverIds.length > 0) {
            var empSearchObj = search.create({type: 'employee', filters: [search.createFilter({name: "internalid", operator: search.Operator.ANYOF, values: prevApproverObj.approverIds})], columns: [search.createColumn({name: 'internalid'}), search.createColumn({name: 'custentity1'}), search.createColumn({name: 'entityid'})]})    
    
            if(empSearchObj.runPaged().count > 0) {
                
                empSearchObj.run().each(function(result) {
                    var empId = result.getValue({name: 'internalid'});
                    var empNm = result.getValue({name: 'entityid'});
                    var desgTxt = result.getText({name: 'custentity1'});
                    if(empId) {
                        for(var i=0;i<prevApproverObj.approverIds.length;i++) {
                            if(Number(empId) == Number(prevApproverObj.approverIds[i])) {
                                prevApproverObj.desig[i] = desgTxt;
                                prevApproverObj.approverNms[i] = empNm;
                            }
                        }
                    }
                    return true;
                });
    
                tempString += "<table border= '0' cellspacing='0' cellpadding='5'>";
                    for(var i=0;i<prevApproverObj.approverIds.length;i++) {
                        var sr = Number(i)+1;
                        tempString += "<tr>";
                            tempString += "<td>"+sr+". Approval Level #"+prevApproverObj.approvalLvl[i]+": "+prevApproverObj.approverNms[i]+" ( "+prevApproverObj.desig[i]+" ), Status: "+prevApproverObj.approvalStatus[i]+"</td>";
                        tempString += "</tr>";
                    }
                        tempString += "<tr>";
                            tempString += "<td>Etc.</td>";
                        tempString += "</tr>";
                tempString += "</table>";
                
            }
        }
        return tempString;
    }

    function _getPOAttachments(poId) {
        
        var fileObjsTemp = [];

        var purchaseorderSearchObj = search.create({
            type: "purchaseorder",
            filters:
            [
               ["type","anyof","PurchOrd"], 
               "AND", 
               ["internalidnumber","equalto",poId], 
               "AND", 
               ["mainline","is","T"], 
               "AND", 
               ["file.name","isnotempty",""]
            ],
            columns:
            [
               search.createColumn({name: "tranid", label: "Document Number"}),
               search.createColumn({name: "internalid", join: "file", label: "Name"})
            ]
         });
         var searchResultCount = purchaseorderSearchObj.runPaged().count;
         log.debug("purchaseorderSearchObj result count",searchResultCount);
         purchaseorderSearchObj.run().each(function(result){
            //log.debug({title: 'File Object from search', details: result.getValue({name: 'name', join:'file'})});
            fileObjsTemp.push(file.load({id: result.getValue({name: 'internalid', join:'file'})}));
            return true;
         });

         return fileObjsTemp;
    }

    return {
        onRequest: onRequest
    };

});