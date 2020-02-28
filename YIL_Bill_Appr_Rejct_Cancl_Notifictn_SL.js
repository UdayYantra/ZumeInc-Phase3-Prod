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
                var vendorBillId   = requestObj.parameters['recId'];
                var vendBillApprFlowId  = requestObj.parameters['prAfId'];
                var nexeLevelCount      = requestObj.parameters['nextLevel'];
                if(!fromRecordFlag) {
                    vendorBillId = getDecodedValue(vendorBillId);
                    vendBillApprFlowId = getDecodedValue(vendBillApprFlowId);
                    nexeLevelCount = getDecodedValue(nexeLevelCount);
                }
                
                _approverFunctionality(context, requestObj, form, vendorBillId, vendBillApprFlowId, nexeLevelCount, fromRecordFlag);

            }
            else if(processFlag == "r") {
                //Purchase Request Reject
                var vendorBillId   = requestObj.parameters['recId'];
                var vendBillApprFlowId  = requestObj.parameters['prAfId'];
                var nexeLevelCount      = requestObj.parameters['nextLevel'];

                if(!fromRecordFlag) {
                    vendorBillId = getDecodedValue(vendorBillId);
                    vendBillApprFlowId = getDecodedValue(vendBillApprFlowId);
                    nexeLevelCount = getDecodedValue(nexeLevelCount);
                }

                _rejectFunctionality(context, requestObj, form, vendorBillId, vendBillApprFlowId, nexeLevelCount, fromRecordFlag);
                
            }
            else if(processFlag == "s") {
                //Purchase Request Send Notification
                var vendorBillId   = requestObj.parameters['recId'];
                var vendBillApprFlowId  = requestObj.parameters['prAfId'];

                _sendNotificationFunctionality(context, requestObj, form, vendorBillId, vendBillApprFlowId);
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
            var vendorBillId = context.request.parameters['custpage_pr_id'];
            log.debug({title: 'ProcessFlag', details: processFlag});

            if(processFlag == "a") {
                var approveStatus = context.request.parameters['custpage_bfr_sts'];
                if(approveStatus == 1) {
                    //You have approved message
                    var form = ui.createForm({title: 'Bill Approval', hideNavBar: true});
                    var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                    var defaultText = '<center><font size="5" face="arial">You have approved the Bill. Thank you.</font></center>';
                    
                    if(fromRecordFlag) {
                        //Show Back button
                        defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+vendorBillId+'">View Bill</a></font></center>';
                    }

                    msgFld.defaultValue = defaultText;
                    context.response.writePage(form);
                }
                else if(approveStatus == 2) {
                    //You already approved message
                    var form = ui.createForm({title: ' ', hideNavBar: true});
                    var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                    var defaultText = '<center><font size="5" face="arial">You have already approved this Bill. Thank you.</font></center>';
                    
                    if(fromRecordFlag) {
                        //Show Back button
                        defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+vendorBillId+'">View Bill</a></font></center>';
                    }

                    msgFld.defaultValue = defaultText;
                    context.response.writePage(form);
                }
                else if(approveStatus == 3) {
                    //You already rejected message
                    var form = ui.createForm({title: ' ', hideNavBar: true});
                    var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                    var defaultText = '<center><font size="5" face="arial">You have already rejected this Bill. Thank you.</font></center>';
                    
                    if(fromRecordFlag) {
                        //Show Back button
                        defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+vendorBillId+'">View Bill</a></font></center>';
                    }

                    msgFld.defaultValue = defaultText;
                    context.response.writePage(form);
                }
            }            
            else if(processFlag == "r") {
                
                var reasonText  = context.request.parameters['custpage_reason'];
                var vendorBillId        = context.request.parameters['custpage_pr_id'];
                var prafId      = context.request.parameters['custpage_praf_id'];
                var nextLevel   = context.request.parameters['custpage_nxt_lvl'];
                var fromRecordFlag = context.request.parameters['custpage_from_rec_flag'];
                var updatedVendBillId = '';
                var updatedPRFAID = '';
                var requestorId = '';
                var preparerId = '';

                if(reasonText && vendorBillId && prafId && nextLevel) {
                    
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
    
                            var vendorBillObj = record.load({type: 'vendorbill', id: vendorBillId});
                            if(vendorBillObj) {
                                requestorId = vendorBillObj.getValue({fieldId: 'custbody11_2'});
                                preparerId  = vendorBillObj.getValue({fieldId: 'custbody_creator'});
                                vendorBillObj.setValue({fieldId: 'custbody_rejection_justifctn', value: reasonText.toString()});
                                vendorBillObj.setValue({fieldId: 'custbody_pr_approval_status', value: "Rejected."});
                                vendorBillObj.setValue({fieldId: 'approvalstatus', value: 3});
                                vendorBillObj.setValue({fieldId: 'custbody10_2', value: 3});
                                updatedVendBillId = vendorBillObj.save();
                            }
                        }
                    }
                    catch(err) {
                        log.debug({title: "Error Rejecting Bill", details:err});
                    }
                    var defaultText = '';
                    if(updatedPRFAID && updatedVendBillId) {
                        defaultText = '<center><font size="5" face="arial">You have rejected the Bill. Thank you.</font></center>';
                    
                        if(fromRecordFlag) {
                            //Show Back button
                            defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+vendorBillId+'">View Bill</a></font></center>';
                        }
                        var prevApproverTableString = _getApproverWithDesignTable(prevApproverObj);
                        log.debug({title:"prevApproverObj", details: prevApproverObj});
                        _sendRejectionEmail(vendorBillId, requestorId, preparerId, reasonText, prevApproverTableString);
                    }
                    else {
                        defaultText = '<center><font size="5" face="arial">There is some problem to reject the Bill. Please contact your administrator. Thank you.</font></center>';
                    
                        if(fromRecordFlag) {
                            //Show Back button
                            defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+vendorBillId+'">View Bill</a></font></center>';
                        }
                    }
                    var form = ui.createForm({title: 'Bill Rejection', hideNavBar: true});
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

    function _approverFunctionality(context, requestObj, form, vendorBillId, vendBillApprFlowId, nexeLevelCount, fromRecordFlag) {
        
        var purchaseRequesField     = form.addField({id: 'custpage_pr_id', type: ui.FieldType.SELECT, label: 'Purchase Request', source: 'transaction'});
        var purchApproveFlowField   = form.addField({id: 'custpage_praf_id', type: ui.FieldType.SELECT, label: 'Purchase Approval Flow', source: 'customrecord_pr_approval_flow'});
        var nextLevelField          = form.addField({id: 'custpage_nxt_lvl', type:ui.FieldType.TEXT, label: 'Next Level'});
        var statusBeforeApproveField     = form.addField({id: 'custpage_bfr_sts', type:ui.FieldType.TEXT, label: 'Status Before Approve'});
        var submitBtn = form.addSubmitButton({label: 'Submit'});
        submitBtn.isHidden = true;

        purchaseRequesField.defaultValue = vendorBillId;
        purchApproveFlowField.defaultValue = vendBillApprFlowId;
        nextLevelField.defaultValue = nexeLevelCount;

        purchaseRequesField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
        purchApproveFlowField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});;
        nextLevelField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
        statusBeforeApproveField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});

        if(vendorBillId && vendBillApprFlowId && nexeLevelCount) {

            var vendorBillStatus = search.lookupFields({type: 'vendorbill', id: vendorBillId, columns: ['approvalstatus']});
            var proceedFlag = true;
            if(vendorBillStatus.approvalstatus[0]) {
                if(vendorBillStatus.approvalstatus[0].value == 3) {

                    var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                    var defaultText = '<center><font size="5" face="arial">This Bill is already rejected and not in use any more. Thank you.</font></center>';
                    
                    if(fromRecordFlag) {
                        //Show Back button
                        defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+vendorBillId+'">View Bill</a></font></center>';
                    }
                    
                    msgFld.defaultValue = defaultText;
                    proceedFlag = false;
                }
            }

            if(proceedFlag) {

                var purchaseApprovalFlowObj = record.load({type: 'customrecord_pr_approval_flow', id: vendBillApprFlowId, isDynamic: true});

                if(purchaseApprovalFlowObj) {
    
                    var statusFieldText = "custrecord_approval_status_"+nexeLevelCount;
                    var noOfLevels  = purchaseApprovalFlowObj.getValue({fieldId: 'custrecord_no_of_level'});
                    var buApprovals = purchaseApprovalFlowObj.getValue({fieldId: 'custrecord_bu_approvar_level_no'});
                    var statusBeforeApproveValue = purchaseApprovalFlowObj.getValue({fieldId: statusFieldText.toString()});
                    var buStart     = '';
                    var buEnd       = '';
                    var vendorBillStatus = '';
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

                                log.debug({title: 'Bill Approval Flow updated successfully.', details: updatedPRId});
                                log.debug({title: 'sendEmailTo.', details: sendEmailTo});
                                log.debug({title: 'emailNxtLevelAtt.', details: emailNxtLevelAtt});
                                
                                if(sendEmailTo.length > 0) {
                                    log.debug({title: "sendEmailTo => ", details: sendEmailTo});
                                    log.debug({title: "emailNxtLevelAtt => ", details: emailNxtLevelAtt});

                                    
                                    
                                    log.debug({title: "prevApproverObj => ", details: prevApproverObj});

                                    _pendingApprovalEmailTemplate(vendorBillId, updatedPRId, sendEmailTo, emailNxtLevelAtt, prevApproverTableString);
                                }
    
                                log.debug({title: "allStatues => ", details: allStatues});
                                
                                
                                    var vbRecObj = record.load({type: 'vendorbill', id: vendorBillId});
                                    var requesterId = '';
                                    var preparerId = '';
                                
                                    if(vbRecObj) {
                                        if(allStatues.indexOf("1") < 0 && allStatues.indexOf("0") < 0) {
                                            vbRecObj.setValue({fieldId: 'approvalstatus', value: 2});
                                            vbRecObj.setValue({fieldId: 'custbody10_2', value: 2});
                                            vbRecObj.setValue({fieldId: 'custbody_pr_approval_status', value: "All Levels Approved."});
                                        }
                                        else {
                                            vbRecObj.setValue({fieldId: 'custbody_pr_approval_status', value: custPRApprovalStatus});
                                        }
                                        vbRecObj.save();
                                        if(allStatues.indexOf("1") < 0 && allStatues.indexOf("0") < 0) {
                                            _sendAllApprovedEmail(vendorBillId, vbRecObj, prevApproverTableString);
                                        }
                                    }
                                
    
                            }//if(updatedPRId)
        
                            
                        }
                        catch(err) {
                            log.debug({title: "Error Encountered during Bill Approval Flow Update", details: err});
                        }
    
                    }
    
                    var submitField = form.addField({id: 'custpage_submit', type: ui.FieldType.INLINEHTML, label: ' '});
                    submitField.defaultValue = "<script>setTimeout(function() { document.getElementById('main_form').submit(); }, 800);</script>"
                    //submitField.updateDisplayType({displayType: ui.FieldDisplayType.INLINEHTML});
    
                }
            }

        }//if(vendorBillId && vendBillApprFlowId && nexeLevelCount)


    }

    function _rejectFunctionality(context, requestObj, form, vendorBillId, vendBillApprFlowId, nexeLevelCount, fromRecordFlag) {

        var vendorBillStatus = search.lookupFields({type: 'vendorbill', id: vendorBillId, columns: ['approvalstatus']});
        var proceedFlag = true;
        form.title = "Bill Rejection";
        if(vendorBillStatus.approvalstatus[0]) {
            if(vendorBillStatus.approvalstatus[0].value == 3) {

                var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                var defaultText = '<center><font size="5" face="arial">This Bill is already rejected and not in use any more. Thank you.</font></center>';
                
                if(fromRecordFlag) {
                    //Show Back button
                    defaultText += '<center><br/><br/><font size="5" face="arial"><a href="/app/accounting/transactions/vendbill.nl?id='+vendorBillId+'">View Bill</a></font></center>';
                }
                
                msgFld.defaultValue = defaultText;
                proceedFlag = false;
            }
            else if(vendorBillStatus.approvalstatus[0].value == 1 || vendorBillStatus.approvalstatus[0].value == 2) {
                var prAfObj = record.load({type: 'customrecord_pr_approval_flow', id: vendBillApprFlowId});
                
                if(prAfObj) {
                    var statusFieldText = "custrecord_approval_status_"+nexeLevelCount;
                    var prAfStatusValue = prAfObj.getValue({fieldId: statusFieldText.toString()});
                    
                    if(prAfStatusValue == 2) {
                        var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                        var defaultText = '<center><font size="5" face="arial">This Bill is already approved. Thank you.</font></center>';
                        proceedFlag = false;
                        msgFld.defaultValue = defaultText;
                    }
                    else if(prAfStatusValue == 3) {
                        var msgFld = form.addField({id: 'custpage_message', type: ui.FieldType.INLINEHTML, label: ' '});
                        var defaultText = '<center><font size="5" face="arial">This Bill is already rejected. Thank you.</font></center>';
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
           
            purchaseRequesField.defaultValue = vendorBillId;
            purchApproveFlowField.defaultValue = vendBillApprFlowId;
            nextLevelField.defaultValue = nexeLevelCount;
    
            purchaseRequesField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
            purchApproveFlowField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
            nextLevelField.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
    
            form.addSubmitButton({label: 'Confirm Reject'});
    
        }

    }


    function _sendNotificationFunctionality(context, requestObj, form, vendorBillId, vendBillApprFlowId) {

        if(vendorBillId && vendBillApprFlowId) {

            var sendEmailTo = [];
            var emailNxtLevelAtt = [];
            var purchaseApprovalFlowObj = record.load({type: 'customrecord_pr_approval_flow', id: vendBillApprFlowId});

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
                    _pendingApprovalEmailTemplate(vendorBillId, vendBillApprFlowId, sendEmailTo, emailNxtLevelAtt, prevApproverTableString);
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

    function _pendingApprovalEmailTemplate(vendorBillId, updatedPRId, sendEmailTo, emailNxtLevelAtt, prevApproverTableString) {

        //Procurement, Zume Inc 60252
        //var fileObj = render.transaction({entityId: Number(vendorBillId), printMode: render.PrintMode.PDF, isCustLocale: true});
        
        var billTableString = "";
        var fileIdsArr = [];
        var attachmentArr = [];
        var suiteletURL = url.resolveScript({scriptId: 'customscript_yil_bill_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_bill_apr_rej_can_ntf_sl', returnExternalUrl: true});
        
        var vendBillObj = record.load({type: 'vendorbill', id: vendorBillId});
        var tranIdText = '', requestorName = '', preparerName = '', vendorName  = '', totalAmount = '', departnmentName = '', className = '';
        if(vendBillObj) {
            tranIdText = vendBillObj.getValue({fieldId: 'transactionnumber'});
            requestorName = vendBillObj.getText({fieldId: 'custbody11_2'});
            preparerName = vendBillObj.getText({fieldId: 'custbody_creator'});
            vendorName = vendBillObj.getText({fieldId: 'entity'});
            totalAmount = vendBillObj.getValue({fieldId: 'total'});
            departnmentName = vendBillObj.getText({fieldId: 'department'});
            className = vendBillObj.getText({fieldId: 'class'});
            totalAmount = Number(totalAmount).toFixed(2);
            billTableString = _getItemAndExpenseTable(vendBillObj);

            var fileIdsArr = _getFileIdsFromBillSearch(vendorBillId);
            if(fileIdsArr.length > 0) {
                attachmentArr = _makeFileObjArr(fileIdsArr);
            }

        }


        var emailSubject = "Bill #"+tranIdText + " has been submitted for your approval.";
        for(var s=0;s<sendEmailTo.length;s++) {
            var emailToId = sendEmailTo[s];
            var bodyString = "";
            var nextLevel = emailNxtLevelAtt[s];
            var userName = 'User';
            var empObj = search.lookupFields({type: search.Type.EMPLOYEE, id: emailToId, columns: ["firstname"]});
            if(empObj) {
                log.debug({title: "empObj", details: JSON.stringify(empObj)});
                userName = empObj.firstname;
            }

            //var param = {processFlag: 'a', prAfId: prAfId, recId: recId, nextLevel: nextLevel, fromrec: "1"};

            var approveURLParam = suiteletURL + '&processFlag=a&prAfId='+getEncodedValue(updatedPRId)+'&recId='+getEncodedValue(vendorBillId)+'&nextLevel='+getEncodedValue(nextLevel);
            var rejectURLParam = suiteletURL + '&processFlag=r&prAfId='+getEncodedValue(updatedPRId)+'&recId='+getEncodedValue(vendorBillId)+'&nextLevel='+getEncodedValue(nextLevel);

            bodyString += " <html>";
            bodyString += "     <body>";
            bodyString += "         Dear "+userName+",<br/><br/>You have received a new Bill for approval.";
            bodyString += "         <br/><br/>";
            
            bodyString += "         <table>";
            bodyString += "         <tr><td>Bill Number</td><td>:</td><td>"+tranIdText+"</td></tr>";
            bodyString += "         <tr><td>Requester</td><td>:</td><td>"+requestorName+"</td></tr>";
            bodyString += "         <tr><td>Preparer</td><td>:</td><td>"+preparerName+"</td></tr>";
            bodyString += "         <tr><td>Vendor</td><td>:</td><td>"+vendorName+"</td></tr>";
            bodyString += "         <tr><td>Total Amount</td><td>:</td><td>"+totalAmount+"</td></tr>";
            bodyString += "         <tr><td>Department</td><td>:</td><td>"+departnmentName+"</td></tr>";
            bodyString += "         <tr><td>Class</td><td>:</td><td>"+className+"</td></tr>";
            bodyString += "         </table>";
            bodyString += "         <br/><br/>";
            bodyString += billTableString;

            if(prevApproverTableString) {
                bodyString += "         <br/><br/><p><b>Approval Detail(s):</b></p><br/>";
                bodyString += prevApproverTableString;
                bodyString += "         <br/><br/>";
            }

            //bodyString += "         Attached PDF is snapshot of PR.<br/>";
            bodyString += "         Please use below buttons to either <i><b>Approve</b></i> or <i><b>Reject</b></i> Bill.";
            bodyString += "         <br/><br/>";
            bodyString += "         <b>Note:</b> Upon rejection system will ask for 'Reason for Rejection'.";

            bodyString += "         <br/><br/>";

            bodyString += "         <a href='"+approveURLParam+"'><img src=https://4879077-sb2.app.netsuite.com/core/media/media.nl?id=22152&c=4879077_SB2&h=9b1dfbb416b36a702a24&expurl=T' border='0' alt='Accept' style='width: 60px;'/></a>";
            bodyString += "         <a href='"+rejectURLParam+"'><img src='https://4879077-sb2.app.netsuite.com/core/media/media.nl?id=22151&c=4879077_SB2&h=65142f106e82b6703fdb&expurl=T' border='0' alt='Reject' style='width: 60px;'/></a>";
            bodyString += "         <br/><br/>Thank you<br/>Admin";
            bodyString += "     </body>";
            bodyString += " </html>";
            
            var emailObj = email.send({
                author: 60252,
                recipients: emailToId,
                subject: emailSubject,
                body: bodyString,
                attachments: attachmentArr,
                //relatedRecords: {transactionId: Number(vendorBillId)}
            });
        }
    }

    function _sendRejectionEmail(vendorBillId, requestorId, preparerId, reasonText, prevApproverTableString) {
        //Procurement, Zume Inc 60252
        //var fileObj = render.transaction({entityId: Number(vendorBillId), printMode: render.PrintMode.PDF, isCustLocale: true});
        var bodyString = "";
        var poTableString = "";
        var fileIdsArr = [];
        var attachmentArr = [];
        var userName    = "User";
        
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

        var vendorBillObj = record.load({type: 'vendorbill', id: vendorBillId});
        var tranIdText = '', requestorName = '', preparerName = '', vendorName  = '', totalAmount = '', departnmentName = '', className = '';
        if(vendorBillObj) {
            tranIdText = vendorBillObj.getValue({fieldId: 'transactionnumber'});
            requestorName = vendorBillObj.getText({fieldId: 'custbody11_2'});
            preparerName = vendorBillObj.getText({fieldId: 'custbody_creator'});
            vendorName = vendorBillObj.getText({fieldId: 'entity'});
            totalAmount = vendorBillObj.getValue({fieldId: 'total'});
            departnmentName = vendorBillObj.getText({fieldId: 'department'});
            className = vendorBillObj.getText({fieldId: 'class'});
            totalAmount = Number(totalAmount).toFixed(2);
            poTableString += _getItemAndExpenseTable(vendorBillObj) ;
            
            var fileIdsArr = _getFileIdsFromBillSearch(vendorBillId);
            if(fileIdsArr.length > 0) {
                attachmentArr = _makeFileObjArr(fileIdsArr);
            }

        }
        
        var emailSubject = "Bill #"+tranIdText + " has been Rejected.";

        bodyString += " <html>";
            bodyString += "     <body>";
            bodyString += "         Dear "+userName+",<br/><br/>Your Bill #"+tranIdText+" has been Rejected.";
            bodyString += "         <br/>";
            
            bodyString += "         <table>";
            bodyString += "         <tr><td>Bill Number</td><td>:</td><td>"+tranIdText+"</td></tr>";
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

        var emailObj = email.send({
                author: 60252,
                recipients: [requestorId, preparerId],
                subject: emailSubject,
                body: bodyString,
                attachments: attachmentArr,
                //relatedRecords: {transactionId: Number(vendorBillId)}
            });
        
    }

    function _sendAllApprovedEmail(vendorBillId, vbRecObj, prevApproverTableString) {

        
        var bodyString = "";
        var poTableString = "";
        var fileIdsArr = [];
        var attachmentArr = [];
        var userName    = "User";
        
        
       var tranIdText = '', requestorId = '', requestorName = '', preparerId = '', preparerName = '', vendorName  = '', totalAmount = '', departnmentName = '', className = '';
        if(vbRecObj) {
            tranIdText = vbRecObj.getValue({fieldId: 'transactionnumber'});
            requestorId = vbRecObj.getValue({fieldId: 'custbody11_2'});
            requestorName = vbRecObj.getText({fieldId: 'custbody11_2'});
            preparerId = vbRecObj.getValue({fieldId: 'custbody_creator'});
            preparerName = vbRecObj.getText({fieldId: 'custbody_creator'});
            vendorName = vbRecObj.getText({fieldId: 'entity'});
            totalAmount = vbRecObj.getValue({fieldId: 'total'});
            departnmentName = vbRecObj.getText({fieldId: 'department'});
            className = vbRecObj.getText({fieldId: 'class'});
            invDueDate = vbRecObj.getText({fieldId: 'duedate'});
            totalAmount = Number(totalAmount).toFixed(2);
            poTableString += _getItemAndExpenseTable(vbRecObj) ;

            var fileIdsArr = _getFileIdsFromBillSearch(vendorBillId);
            if(fileIdsArr.length > 0) {
                attachmentArr = _makeFileObjArr(fileIdsArr);
            }

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
        
        var emailSubject = "Invoice #"+tranIdText + " from "+vendorName+" has been approved.";
        bodyString += " <html>";
        bodyString += "     <body>";
        bodyString += "         Dear "+userName+",<br/><br/>Your Bill #"+tranIdText+" has been approved.";
        bodyString += "         <br/>";
        
        bodyString += "         <table>";
        bodyString += "         <tr><td>Invoice Number</td><td>:</td><td>"+tranIdText+"</td></tr>";
        bodyString += "         <tr><td>Requester</td><td>:</td><td>"+requestorName+"</td></tr>";
        bodyString += "         <tr><td>Preparer</td><td>:</td><td>"+preparerName+"</td></tr>";
        bodyString += "         <tr><td>Vendor</td><td>:</td><td>"+vendorName+"</td></tr>";
        bodyString += "         <tr><td>Total Amount</td><td>:</td><td>$"+totalAmount+"</td></tr>";
        bodyString += "         <tr><td>Department</td><td>:</td><td>"+departnmentName+"</td></tr>";
        bodyString += "         <tr><td>Class</td><td>:</td><td>"+className+"</td></tr>";
        bodyString += "         <tr><td>Invoice Due Date:</td><td>:</td><td>"+invDueDate+"</td></tr>";
        bodyString += "         </table>";
        bodyString += "         <br/><br/>";
        bodyString += poTableString;
        
        if(prevApproverTableString) {
            bodyString += "         <br/><br/><p><b>Approval Detail(s):</b></p><br/>";
            bodyString += prevApproverTableString;
            bodyString += "         <br/><br/>";
        }

        bodyString += "     The invoice will be scheduled for payment at the due date.";
        bodyString += "<br/>";
        bodyString += "     For any other questions, please email ap@zume.com and reference the Invoice Number from above.";
        bodyString += "<br/>";

        //bodyString += "         Attached PDF is snapshot of PR.";
        bodyString += "         <br/><br/>Thank you<br/>Zume Purchasing Team";
        bodyString += "     </body>";
        bodyString += " </html>";

        var emailObj = email.send({
                author: 60252,
                recipients: [requestorId, preparerId],
                subject: emailSubject,
                body: bodyString,
                attachments: attachmentArr,
                //relatedRecords: {transactionId: Number(vendorBillId)}
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

            bodyString += "         <a href='"+approveURLParam+"'><img src=https://4879077-sb2.app.netsuite.com/core/media/media.nl?id=22152&c=4879077_SB2&h=9b1dfbb416b36a702a24&expurl=T' border='0' alt='Accept' style='width: 60px;'/></a>";
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
                            var lndescription   = prObj.getSublistText({sublistId: 'item', fieldId: 'description', line: it});
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
                                poTableString += "  <td align=\"left\">"+lndescription+"</td>";
                                poTableString += "  <td align=\"center\">"+itemQty+"</td>";
                                poTableString += "  <td align=\"right\">$"+itemRate+"</td>";
                                poTableString += "  <td align=\"right\">$"+itemAmt+"</td>";
                            poTableString += "</tr>";

                        }//for(var it=0;it<poItemLnCount;it++)

                        itemTotalAmount = Number(itemTotalAmount).toFixed(2);

                        poTableString += "<tr>";
                            poTableString += "  <td align=\"right\" colspan=\"7\"><b>Total</b></td>";
                            poTableString += "  <td align=\"right\"><b>"+itemTotalAmount+"</b></td>";
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

    function _getFileIdsFromBillSearch(billId) {

        var fileIdsArr = [];
        var billSearchRes = search.create({type: 'vendorbill', 
            filters: [
                search.createFilter({name: 'internalid', operator: search.Operator.ANYOF, values: billId}),
                search.createFilter({name: 'mainline', operator: search.Operator.IS, values: true})
            ], 
            columns: [
                search.createColumn({name: 'internalid', join: 'file'})
            ]
        });

        if(billSearchRes.runPaged().count > 0) {
            billSearchRes.run().each(function(result) {
                var fileId = result.getValue({name: 'internalid', join: 'file'});
                if(fileId) {
                    fileIdsArr.push(fileId);
                }
                return true;
            })
        }

        return fileIdsArr;

    }
    
    function _makeFileObjArr(fileIdsArr) {

        var returnableArr = [];

        if(fileIdsArr.length > 0) {
            for(var i=0;i<fileIdsArr.length;i++) {
                returnableArr.push(file.load({id: fileIdsArr[i]}));
            }
        }

        return returnableArr;
    }

    return {
        onRequest: onRequest
    };

});