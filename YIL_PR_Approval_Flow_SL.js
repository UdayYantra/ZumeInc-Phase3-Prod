/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * 
 */

define(['N/record', 'N/http', 'N/search', 'N/render', "N/email", "N/url", "N/encode", "N/file"], function(record, http, search, render, email, url, encode, file) {

    var DelegationMatrix = {};        
    DelegationMatrix.ID                     = [];
    DelegationMatrix.fromEmployee           = [];
    DelegationMatrix.toEmployee             = [];
    DelegationMatrix.impactedTransaction    = [];
    DelegationMatrix.prLevelString          = [];
    DelegationMatrix.updateLevels           = [];

    function onRequest(context) {

        var requestObj = context.request;

        if(requestObj.method == http.Method.GET) {

            var purchaseReqId = requestObj.parameters['prId'];
            var fpaApproverId = requestObj.parameters['fpaapprover'];
            var hocApproverId = requestObj.parameters['hocapprover'];
            //var buApproverIds = requestObj.parameters['buapprovers'];
            
            log.debug({title: 'purchaseReqId', details: purchaseReqId});
            log.debug({title: 'Fpa Approvers', details: fpaApproverId});
            //log.debug({title: 'BU Approvers', details: buApproverIds});
            var returnInactivateErrorMesssage = "You cannot submit the Purchase Request because one or more approvers for this PR are inactive. Please contact the system administrator.";
            try {
                
                var prRecordObj     = record.create({type:'customrecord_pr_approval_flow', isDynamic:true});
                var currentRecObj   = record.load({type: 'purchaseorder', id: purchaseReqId});
                var skipApproverArr = [];
                var allApprovers    = [];
                var allApproversStatus    = [];
                var nextLevelCount  = 1;
                var sendEmailToArr  = [];
                var custPRApprovalStatus  = '';
                var emailNxtLevelAtt= [];

                var departClassArr  = [];
                var dprtClsAprvArr  = [];

                var updatedDeligationIndexArr = [];
                

                log.debug({title: 'Current Record Id', details: currentRecObj});
                if(prRecordObj != null && prRecordObj != 'undefined' && currentRecObj != null && currentRecObj != 'undefined') {
                    
                    var requestorId = currentRecObj.getValue({fieldId: 'custbody_requestor'});
                    var preparerId  = currentRecObj.getValue({fieldId: 'employee'});
                    var prAmount    = currentRecObj.getValue({fieldId: 'total'});
                    var requestorApprover = requestorId;
                    _gatherDelegationMatrixObj();

                    if(DelegationMatrix.ID.length > 0) {
                        var tempIndex = DelegationMatrix.fromEmployee.indexOf(requestorId);
                        if(tempIndex >= 0) {
                            updatedDeligationIndexArr.push(tempIndex);
                            requestorApprover = DelegationMatrix.toEmployee[tempIndex];
                            var tmpLvls = DelegationMatrix.updateLevels[tempIndex];
                            if(tmpLvls) {
                                tmpLvls += "_";
                            }
                            tmpLvls += "1";
                            DelegationMatrix.updateLevels[tempIndex] = tmpLvls;
                        }
                    }

                    log.debug({title: "DelegationMatrix", details: JSON.stringify(DelegationMatrix)});

                    //*********************************************** Step 1 : Requestor *******************************************************/
                            
                            var inactiveEmpObj = search.lookupFields({type: 'employee', id: requestorId, columns: ['isinactive', 'firstname']});

                            if(inactiveEmpObj.isinactive) {
                                log.debug({title: 'Inactive Employee Name', details: inactiveEmpObj.firstname});
                                _sendEmailToPOCreatorForInactiveEmployee(preparerId, currentRecObj, inactiveEmpObj.firstname);
                                context.response.write({output: returnInactivateErrorMesssage});
                                return;
                            }

                            log.debug({title: 'preparerId', details: preparerId});
                            log.debug({title: 'requestorId', details: requestorId});
                            log.debug({title: 'requestorApprover', details: requestorApprover});

                            if(requestorApprover == preparerId) {

                                var nextApproverField       = "custrecord_approver_"+nextLevelCount;
                                var nextApprovalStatusField = "custrecord_approval_status_"+nextLevelCount;
                                var nextApprovalSkipField   = "custrecord_approval_skip_"+nextLevelCount;

                                prRecordObj.setValue({fieldId: nextApproverField, value: requestorApprover});
                                prRecordObj.setValue({fieldId: nextApprovalStatusField, value: 2});
                                prRecordObj.setValue({fieldId: nextApprovalSkipField, value: true});

                                skipApproverArr.push(requestorApprover);
                                allApprovers.push(requestorApprover);
                                allApproversStatus.push(2);
                                nextLevelCount++;

                            }
                            else if(requestorApprover != preparerId) {
                                
                                var nextApproverField       = "custrecord_approver_"+nextLevelCount;
                                var nextApprovalStatusField = "custrecord_approval_status_"+nextLevelCount;
                                var nextApprovalSkipField   = "custrecord_approval_skip_"+nextLevelCount;

                                prRecordObj.setValue({fieldId: nextApproverField, value: requestorApprover});
                                prRecordObj.setValue({fieldId: nextApprovalStatusField, value: 1});

                                emailNxtLevelAtt.push(nextLevelCount);
                                nextLevelCount++;
                                isPendApproval = true;
                                sendEmailToArr.push(requestorApprover);
                                allApprovers.push(requestorApprover);
                                allApproversStatus.push(1);

                            }
                            
                            /*log.debug({title: 'nextLevelCount', details: nextLevelCount});
                            log.debug({title: 'isPendApproval', details: isPendApproval});
                            log.debug({title: 'sendEmailToArr', details: sendEmailToArr});*/

                    //*********************************************** Step 2 : FP & A *******************************************************/
                        if(fpaApproverId) {

                            if(DelegationMatrix.ID.length > 0) {
                                var tempIndex = DelegationMatrix.fromEmployee.indexOf(fpaApproverId);
                                if(tempIndex >= 0) {
                                    updatedDeligationIndexArr.push(tempIndex);
                                    fpaApproverId = DelegationMatrix.toEmployee[tempIndex];
                                    var tmpLvls = DelegationMatrix.updateLevels[tempIndex];
                                    if(tmpLvls) {
                                        tmpLvls += "_";
                                    }
                                    tmpLvls += nextLevelCount;
                                    DelegationMatrix.updateLevels[tempIndex] = tmpLvls;
                                }
                            }

                            var inactiveEmpObj = search.lookupFields({type: 'employee', id: fpaApproverId, columns: ['isinactive', 'firstname']});

                            log.debug({title: 'inactiveEmpObj', details: inactiveEmpObj.isinactive});
                            
                            if(inactiveEmpObj.isinactive) {
                                log.debug({title: 'Inactive Employee Name', details: inactiveEmpObj.firstname});
                                _sendEmailToPOCreatorForInactiveEmployee(preparerId, currentRecObj, inactiveEmpObj.firstname);
                                context.response.write({output: returnInactivateErrorMesssage});
                                return;
                            }

                            log.debug({title: 'fpaApproverId', details: fpaApproverId});
                            var nextApproverField       = "custrecord_approver_"+nextLevelCount;
                            var nextApprovalStatusField = "custrecord_approval_status_"+nextLevelCount;
                            var nextApprovalSkipField   = "custrecord_approval_skip_"+nextLevelCount;
                            var emalNxtLvl = nextLevelCount;
                            nextLevelCount++;
                            prRecordObj.setValue({fieldId: nextApproverField, value: fpaApproverId});
                            
                            _nextApproversStatusSet(prRecordObj, allApprovers, allApproversStatus, sendEmailToArr, emailNxtLevelAtt, fpaApproverId, nextApprovalStatusField, nextApprovalSkipField, emalNxtLvl, preparerId);
                    
                        }
                            
                    //*********************************************** Step 2.5 : HOC Approver *******************************************************/
                            
                        if(hocApproverId) {

                            if(DelegationMatrix.ID.length > 0) {
                                var tempIndex = DelegationMatrix.fromEmployee.indexOf(hocApproverId);
                                if(tempIndex >= 0) {
                                    updatedDeligationIndexArr.push(tempIndex);
                                    hocApproverId = DelegationMatrix.toEmployee[tempIndex];
                                    var tmpLvls = DelegationMatrix.updateLevels[tempIndex];
                                    if(tmpLvls) {
                                        tmpLvls += "_";
                                    }
                                    tmpLvls += nextLevelCount;
                                    DelegationMatrix.updateLevels[tempIndex] = tmpLvls;
                                }
                            }

                            var inactiveEmpObj = search.lookupFields({type: 'employee', id: hocApproverId, columns: ['isinactive', 'firstname']});

                            log.debug({title: 'inactiveEmpObj', details: inactiveEmpObj.isinactive});
                            
                            if(inactiveEmpObj.isinactive) {
                                log.debug({title: 'Inactive Employee Name', details: inactiveEmpObj.firstname});
                                _sendEmailToPOCreatorForInactiveEmployee(preparerId, currentRecObj, inactiveEmpObj.firstname);
                                context.response.write({output: returnInactivateErrorMesssage});
                                return;
                            }

                            log.debug({title: 'hocApproverId', details: hocApproverId});
                            var nextApproverField       = "custrecord_approver_"+nextLevelCount;
                            var nextApprovalStatusField = "custrecord_approval_status_"+nextLevelCount;
                            var nextApprovalSkipField   = "custrecord_approval_skip_"+nextLevelCount;
                            var emalNxtLvl = nextLevelCount;
                            nextLevelCount++;
                            prRecordObj.setValue({fieldId: nextApproverField, value: hocApproverId});
                            
                            _nextApproversStatusSet(prRecordObj, allApprovers, allApproversStatus, sendEmailToArr, emailNxtLevelAtt, hocApproverId, nextApprovalStatusField, nextApprovalSkipField, emalNxtLvl, preparerId);
                    
                        }
                            
                    //*********************************************** Step 3 : Director, VP, SVP, .... *******************************************************/
                            //requestorId
                            //prAmount
                            var designationArr      = [];
                            var budgetApprovalObj   = [];

                            var budgetApproverSearch = search.create({type: 'customrecord_budget_approvers', filters: ['isinactive', search.Operator.IS, "F"], columns: [search.createColumn({name: 'custrecord_ba_desgination'}), search.createColumn({name: 'custrecord_ba_aftr_bu_aprv'}), search.createColumn({name: 'custrecord_ba_amt_limit'}), search.createColumn({name: 'custrecord_ba_and_above'})]});
                            budgetApproverSearch.run().each(function(buresult) {
                                var designtn        = buresult.getValue({name: 'custrecord_ba_desgination'});
                                var afterBuAprvl    = buresult.getValue({name: 'custrecord_ba_aftr_bu_aprv'});
                                var amtLimit        = buresult.getValue({name: 'custrecord_ba_amt_limit'});
                                var andAbvChk       = buresult.getValue({name: 'custrecord_ba_and_above'});
                                
                                designationArr.push(designtn);
                                budgetApprovalObj.push({designtn: designtn, afterBuAprvl:afterBuAprvl, amtLimit:amtLimit, andAbvChk:andAbvChk});

                                return true;
                            });
                            
                            log.debug({title: "designationArr", details: designationArr});
                            log.debug({title: "budgetApprovalObj", details: JSON.stringify(budgetApprovalObj)});
                            
                            var empLookupObj = search.lookupFields({type:search.Type.EMPLOYEE, id: requestorId, columns: ['supervisor']});
                                
                            var beforeBUApprovers   = [];
                            var afterBUApprovers    = [];
                            var nxtBudgtAprver      = '';
                            if(empLookupObj.supervisor[0]) {
                                nxtBudgtAprver = empLookupObj.supervisor[0].value;
                            }
                            var loopOn              = 0;
                            log.debug({title: "nxtBudgtAprver", details: nxtBudgtAprver});
                            if(nxtBudgtAprver != null) {

                                while(loopOn == 0) {
                                    
                                    if(nxtBudgtAprver != null) {
                                        log.debug({title: "nxtBudgtAprver", details: nxtBudgtAprver});
                                        var empLookupObj = search.lookupFields({type:search.Type.EMPLOYEE, id: nxtBudgtAprver, columns: ['supervisor', 'custentity1']});
                                        var empDesignation = '';
                                        var empSupervisor  = '';
                                        if(empLookupObj.custentity1[0]) {
                                           empDesignation = empLookupObj.custentity1[0].value;
                                        }
                                        if(empLookupObj.supervisor[0]) {
                                            empSupervisor  = empLookupObj.supervisor[0].value;
                                        }
                                        
                                        

                                        if(empDesignation != null) {
                                            
                                            var desgIndex = designationArr.indexOf(empDesignation);
                                            if(desgIndex >= 0) {

                                                var afterBuAprvl    = budgetApprovalObj[desgIndex].afterBuAprvl;
                                                var amtLimit        = budgetApprovalObj[desgIndex].amtLimit;
                                                var andAbvChk       = budgetApprovalObj[desgIndex].andAbvChk;

                                                /*log.debug({title: "PR Amount", details: prAmount});
                                                log.debug({title: "PR Amount Limit", details: amtLimit});*/

                                                if(Number(prAmount) >= Number(amtLimit)) {

                                                    if(!afterBuAprvl) {
                                                        beforeBUApprovers.push(nxtBudgtAprver);
                                                    }
                                                    else if(afterBuAprvl) {
                                                        afterBUApprovers.push(nxtBudgtAprver);
                                                    }

                                                    if(andAbvChk) {
                                                        loopOn = 1;
                                                    }

                                                }
                                                else {
                                                    if(!afterBuAprvl) {
                                                        beforeBUApprovers.push(nxtBudgtAprver);
                                                    }
                                                    else if(afterBuAprvl) {
                                                        afterBUApprovers.push(nxtBudgtAprver);
                                                    }
                                                    loopOn = 1;
                                                }

                                            }
                                            if(empSupervisor) {
                                                nxtBudgtAprver = empSupervisor;
                                            }
                                            else {
                                                loopOn = 1;
                                            }

                                        }
                                        else {
                                            loopOn = 1;
                                        }
                                    }
                                    
                                }
                                
                            }
                            
                            /*log.debug({title: 'beforeBUApprovers', details: beforeBUApprovers});
                            log.debug({title: 'afterBUApprovers', details: afterBUApprovers});*/
                            log.debug({title: 'beforeBUApprovers', details: beforeBUApprovers});
                            if(beforeBUApprovers.length > 0) {

                                for(var bba=0;bba<beforeBUApprovers.length;bba++) {

                                    var nextApproverField       = "custrecord_approver_"+nextLevelCount;
                                    var nextApprovalStatusField = "custrecord_approval_status_"+nextLevelCount;
                                    var nextApprovalSkipField   = "custrecord_approval_skip_"+nextLevelCount;
                                    var emalNxtLvl = nextLevelCount;
                                    var buApprovertempid = beforeBUApprovers[bba];
                                    if(DelegationMatrix.ID.length > 0) {
                                        var tempIndex = DelegationMatrix.fromEmployee.indexOf(buApprovertempid);
                                        if(tempIndex >= 0) {
                                            updatedDeligationIndexArr.push(tempIndex);
                                            buApprovertempid = DelegationMatrix.toEmployee[tempIndex];
                                            var tmpLvls = DelegationMatrix.updateLevels[tempIndex];
                                            if(tmpLvls) {
                                                tmpLvls += "_";
                                            }
                                            tmpLvls += nextLevelCount;
                                            DelegationMatrix.updateLevels[tempIndex] = tmpLvls;
                                        }
                                    }
                                    nextLevelCount++;

                                    var nxtApproverId = buApprovertempid;

                                    var inactiveEmpObj = search.lookupFields({type: 'employee', id: nxtApproverId, columns: ['isinactive', 'firstname']});

                                    log.debug({title: 'inactiveEmpObj', details: inactiveEmpObj.isinactive});
                                    
                                    if(inactiveEmpObj.isinactive) {
                                        log.debug({title: 'Inactive Employee Name', details: inactiveEmpObj.firstname});
                                        _sendEmailToPOCreatorForInactiveEmployee(preparerId, currentRecObj, inactiveEmpObj.firstname);
                                        context.response.write({output: returnInactivateErrorMesssage});
                                        return;
                                    }

                                    prRecordObj.setValue({fieldId: nextApproverField, value: nxtApproverId});
                                    
                                    _nextApproversStatusSet(prRecordObj, allApprovers, allApproversStatus, sendEmailToArr, emailNxtLevelAtt, nxtApproverId, nextApprovalStatusField, nextApprovalSkipField, emalNxtLvl, preparerId);
                                
                                }

                            }//if(beforeBUApprovers && beforeBUApprovers.length > 0)


                    //*********************************************** Step 4 : Business Unit *******************************************************/
                            var buStartNo = 0;
                            var buEndNo   = 0;
                           
                            /*if(buApproverIds) {
                                var buApproverIdsArr = buApproverIds.split(",");
                                var buLevelesString     = nextLevelCount+",";
                                buStartNo = nextLevelCount;
                                for(var bua=0;bua<buApproverIdsArr.length;bua++) {
                                    
                                    var nextApproverField       = "custrecord_approver_"+nextLevelCount;
                                    var nextApprovalStatusField = "custrecord_approval_status_"+nextLevelCount;
                                    var nextApprovalSkipField   = "custrecord_approval_skip_"+nextLevelCount;
                                    var emalNxtLvl = nextLevelCount;
                                    var nxtApproverId = buApproverIdsArr[bua];
                                    
                                    if(DelegationMatrix.ID.length > 0) {
                                        var tempIndex = DelegationMatrix.fromEmployee.indexOf(nxtApproverId);
                                        if(tempIndex >= 0) {
                                            updatedDeligationIndexArr.push(tempIndex);
                                            nxtApproverId = DelegationMatrix.toEmployee[tempIndex];
                                            var tmpLvls = DelegationMatrix.updateLevels[tempIndex];
                                            if(tmpLvls) {
                                                tmpLvls += "_";
                                            }
                                            tmpLvls += nextLevelCount;
                                            DelegationMatrix.updateLevels[tempIndex] = tmpLvls;
                                        }
                                    }

                                    nextLevelCount++;
                                    log.debug({title: 'BU Approver['+bua+']', details: nxtApproverId});

                                    prRecordObj.setValue({fieldId: nextApproverField, value: nxtApproverId});
                                    
                                    _nextApproversStatusSet(prRecordObj, allApprovers, allApproversStatus, sendEmailToArr, emailNxtLevelAtt, nxtApproverId, nextApprovalStatusField, nextApprovalSkipField, emalNxtLvl, preparerId);
                                
                                }
                                buLevelesString += nextLevelCount-1;
                                buEndNo = nextLevelCount-1;
                            }*/
                            
                    //*********************************************** Step 5 : COO, CFO, CEO, .... *******************************************************/
                    
                            if(afterBUApprovers.length > 0) {
                                for(var aba=0;aba<afterBUApprovers.length;aba++) {
                                    
                                    var nextApproverField       = "custrecord_approver_"+nextLevelCount;
                                    var nextApprovalStatusField = "custrecord_approval_status_"+nextLevelCount;
                                    var nextApprovalSkipField   = "custrecord_approval_skip_"+nextLevelCount;
                                    var emalNxtLvl = nextLevelCount;
                                    
                                    var nxtApproverId = afterBUApprovers[aba];
                                    
                                    if(DelegationMatrix.ID.length > 0) {
                                        var tempIndex = DelegationMatrix.fromEmployee.indexOf(nxtApproverId);
                                        if(tempIndex >= 0) {
                                            updatedDeligationIndexArr.push(tempIndex);
                                            nxtApproverId = DelegationMatrix.toEmployee[tempIndex];
                                            var tmpLvls = DelegationMatrix.updateLevels[tempIndex];
                                            if(tmpLvls) {
                                                tmpLvls += "_";
                                            }
                                            tmpLvls += nextLevelCount;
                                            DelegationMatrix.updateLevels[tempIndex] = tmpLvls;
                                        }
                                    }
                                    nextLevelCount++;
                                    
                                    var inactiveEmpObj = search.lookupFields({type: 'employee', id: nxtApproverId, columns: ['isinactive', 'firstname']});

                                    log.debug({title: 'inactiveEmpObj', details: inactiveEmpObj.isinactive});
                                    
                                    if(inactiveEmpObj.isinactive) {
                                        log.debug({title: 'Inactive Employee Name', details: inactiveEmpObj.firstname});
                                        _sendEmailToPOCreatorForInactiveEmployee(preparerId, currentRecObj, inactiveEmpObj.firstname);
                                        context.response.write({output: returnInactivateErrorMesssage});
                                        return;
                                    }

                                    prRecordObj.setValue({fieldId: nextApproverField, value: nxtApproverId});
                                    //log.debug({title: 'C-Level Approver['+bua+']', details: nxtApproverId});
                                    _nextApproversStatusSet(prRecordObj, allApprovers, allApproversStatus, sendEmailToArr, emailNxtLevelAtt, nxtApproverId, nextApprovalStatusField, nextApprovalSkipField, emalNxtLvl, preparerId);
                                
                                }
                            }
                            
                            nextLevelCount--;
                            //prRecordObj.setValue({fieldId: 'custrecord_bu_approvar_level_no', value: buLevelesString});
                            prRecordObj.setValue({fieldId: 'custrecord_no_of_level', value: nextLevelCount});
                            prRecordObj.setValue({fieldId: 'custrecord_purchase_req', value: purchaseReqId});

                            
                            var stautsEmpId = '';
                            var pendAprvlLvl = '';
                            
                            var prevApproverObj = {approvalLvl: [], approverIds: [], desig: [], approverNms: [], approvalStatus: []};

                            for(var slv=1;slv<=nextLevelCount;slv++) {
                                var tempNextApproverField       = "custrecord_approver_"+slv;
                                var tempNextApprovalStatusField = "custrecord_approval_status_"+slv;
                                if(!pendAprvlLvl) {
                                    if(prRecordObj.getValue({fieldId: tempNextApprovalStatusField.toString()}) == 1) {
                                        stautsEmpId = prRecordObj.getValue({fieldId: tempNextApproverField.toString()});
                                        pendAprvlLvl = slv;
                                    }
                                }
                                if(prRecordObj.getValue({fieldId: tempNextApprovalStatusField.toString()}) == 2) {
                                    prevApproverObj.approvalLvl.push(slv);
                                    prevApproverObj.approverIds.push(prRecordObj.getValue({fieldId: tempNextApproverField.toString()}));
                                    prevApproverObj.desig.push("");
                                    prevApproverObj.approverNms.push("");
                                    prevApproverObj.approvalStatus.push(prRecordObj.getText({fieldId: tempNextApprovalStatusField.toString()}));
                                }
                            }//for(slv=1;slv<=nextLevelCount;slv++)

                            /*if(Number(pendAprvlLvl) >= Number(buStartNo) && Number(pendAprvlLvl) <= Number(buEndNo)) {
                                custPRApprovalStatus = "Pending Approval from BU.";
                            }
                            else {*/
                                var pendAprvlEmpObj = search.lookupFields({type:search.Type.EMPLOYEE, id: stautsEmpId, columns: ['custentity1']});
                                //log.debug({title: "pendAprvlEmpObj", details: JSON.stringify(pendAprvlEmpObj)});
                                if(pendAprvlEmpObj.custentity1[0]) {
                                    var empDesignation = pendAprvlEmpObj.custentity1[0].text;
                                    custPRApprovalStatus = "Pending Approval from "+empDesignation;
                                }
                            //}

                    var prId = prRecordObj.save();
                    log.debug({title: 'PR Approval Id', details: prId});
                    log.debug({title: 'PR allApprovers', details: allApprovers});
                    
                    if(updatedDeligationIndexArr.length > 0) {
                        _updateDelegationMatrix(purchaseReqId, updatedDeligationIndexArr);
                    }
                    
                    

                    currentRecObj.setValue({fieldId: 'custbody_pr_approval_flow', value: prId});
                    currentRecObj.setValue({fieldId: 'custbody_pr_approval_status', value: custPRApprovalStatus});
                    currentRecObj.save();

                    var prevApproverTableString = _getApproverWithDesignTable(prevApproverObj);

                    //Send Email
                    log.debug({title: 'Send Email', details: sendEmailToArr});
                    _pendingApprovalEmailTemplate(purchaseReqId, prId, sendEmailToArr, emailNxtLevelAtt, prevApproverTableString);
                    
                }//if(prRecordObj != null && prRecordObj != 'undefined')

            }
            catch(err) {
                log.debug({title:'Error Encountered on creation of Approval Flow',details: err});
                context.response.write({output: err.toString()});

            }


            context.response.write({output: "true"});

        }

    }

    function _pendingApprovalEmailTemplate(purchaseRequestId, updatedPRId, sendEmailTo, emailNxtLevelAtt, prevApproverTableString) {

        //Procurement, Zume Inc 62360
        //var fileObj = render.transaction({entityId: Number(purchaseRequestId), printMode: render.PrintMode.PDF, isCustLocale: true});
        var bodyString = "";
        var poTableString = "";
        var suiteletURL = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', returnExternalUrl: true});
        
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
                            var lnDescptn       = prObj.getSublistValue({sublistId: 'item', fieldId: 'description', line: it});
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
            

        }

        var fileObjs = [];

        fileObjs = _getPOAttachments(purchaseRequestId);

        log.debug({ttile: 'fileObjs', details: fileObjs});

        var emailSubject = "Purchase Request for Purchase Order No. "+tranIdText + " has been submitted for your approval.";
        for(var s=0;s<sendEmailTo.length;s++) {
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
            bodyString += "         <br/><br/>";
            
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

            bodyString += "         <a href='"+approveURLParam+"'><img src='https://4879077.app.netsuite.com/core/media/media.nl?id=26195&c=4879077&h=2f16d2d13e3bc883893b&expurl=T' border='0' alt='Accept' style='width: 60px;'/></a>";
            bodyString += "         <a href='"+rejectURLParam+"'><img src='https://4879077.app.netsuite.com/core/media/media.nl?id=26194&c=4879077&h=57f894214bdc913b9da1&expurl=T' border='0' alt='Reject' style='width: 60px;'/></a>";
            bodyString += "         <br/>If you have any questions, please email ap@zume.com and reference the Purchase Order Number from above.";
            bodyString += "         <br/><br/>Thank you<br/>Zume Purchasing Team";
            bodyString += "     </body>";
            bodyString += " </html>";
            
            var emailObj = email.send({
                author: 62360,
                recipients: emailToId,
                subject: emailSubject,
                body: bodyString,
                //relatedRecords: {transactionId: Number(purchaseRequestId)},
                attachments: fileObjs
            });
        }
    }

    function _nextApproversStatusSet(prRecordObj, allApprovers, allApproversStatus, sendEmailToArr, emailNxtLevelAtt, currentApproverId, nextApprovalStatusField, nextApprovalSkipField, emalNxtLvl, preparerId) {
        
        if(allApprovers.indexOf(currentApproverId) < 0 && Number(currentApproverId) != Number(preparerId)) {
            //New Approver
            if(allApproversStatus.indexOf(1) < 0) {
                prRecordObj.setValue({fieldId: nextApprovalStatusField, value: 1});
                sendEmailToArr.push(currentApproverId);
                emailNxtLevelAtt.push(emalNxtLvl);
                allApproversStatus.push(1);
            }
            else {
                allApproversStatus.push(0);
            }
        }
        else {
            //Approver available
            if(allApproversStatus[allApprovers.indexOf(currentApproverId)] == 2) {
                prRecordObj.setValue({fieldId: nextApprovalStatusField, value: 2});
                allApproversStatus.push(2);
            }
            else if(allApproversStatus[allApprovers.indexOf(currentApproverId)] == 1) {
                allApproversStatus.push(0);
            }
            prRecordObj.setValue({fieldId: nextApprovalSkipField, value: true});
        }
        
        allApprovers.push(currentApproverId);
    }

    function _gatherDelegationMatrixObj() {

        var deligationSearchFilters = [];
        var deligationSearchColumns = [];
        var deligationSearchResult = '';
        
        deligationSearchFilters.push(["isinactive", 'is', false]);
        deligationSearchFilters.push("AND");
        deligationSearchFilters.push(["custrecord_dm_updated", 'is', true]);
        deligationSearchFilters.push("AND");
        deligationSearchFilters.push(["custrecord_dm_from_date", 'ONORBEFORE', "today"]);
        deligationSearchFilters.push("AND");
        deligationSearchFilters.push(["custrecord_dm_to_date", "ONORAFTER", "today"]);

        deligationSearchColumns.push(search.createColumn({name: 'internalid'}));
        deligationSearchColumns.push(search.createColumn({name: 'custrecord_dm_by_emp'}));
        deligationSearchColumns.push(search.createColumn({name: 'custrecord_dm_to_emp'}));
        deligationSearchColumns.push(search.createColumn({name: 'custrecord_dm_prid_lvlid_flag'}));
        deligationSearchColumns.push(search.createColumn({name: 'custrecord_dm_trans_impcted'}));

        deligationSearchResult = search.create({type: 'customrecord_delegation_matrix', filters: deligationSearchFilters, columns: deligationSearchColumns});

        if(deligationSearchResult.runPaged().count > 0) {
            deligationSearchResult.run().each(function(result) {
                
                var deligationId    = result.getValue({name: 'internalid'});
                var fromEmpId       = result.getValue({name: 'custrecord_dm_by_emp'});
                var toEmpId         = result.getValue({name: 'custrecord_dm_to_emp'});
                var transImpacted   = result.getValue({name: 'custrecord_dm_trans_impcted'});
                var lvlString       = result.getValue({name: 'custrecord_dm_prid_lvlid_flag'});
                
                DelegationMatrix.ID.push(deligationId);
                DelegationMatrix.fromEmployee.push(fromEmpId);
                DelegationMatrix.toEmployee.push(toEmpId);
                DelegationMatrix.impactedTransaction.push(transImpacted);
                DelegationMatrix.prLevelString.push(lvlString);
                DelegationMatrix.updateLevels.push("");
                return true;                
            });
        }

    }//function _gatherDelegationMatrixObj(purchaseReqId, prId, sendEmailToArr, allApprovers) {

    function _updateDelegationMatrix(purchaseReqId, updatedDeligationIndexArr) {

        for(var ud=0;ud<updatedDeligationIndexArr.length;ud++) {
            var udIndex = updatedDeligationIndexArr[ud];
            if(udIndex >= 0) {
                var matrixId = DelegationMatrix.ID[udIndex];
                var tranImpct = DelegationMatrix.impactedTransaction[udIndex];
                var prLevelStr = DelegationMatrix.prLevelString[udIndex];
                var newLevels = DelegationMatrix.updateLevels[udIndex];
                var matrixObj = record.load({type: 'customrecord_delegation_matrix', id: matrixId});
                var tranImpctArr = [];
                if(tranImpct) { tranImpctArr = tranImpct.split(",");}
                tranImpctArr.push(purchaseReqId);
                
                if(prLevelStr) { prLevelStr += ","; }
                prLevelStr += purchaseReqId+":"+newLevels;
                
                if(matrixObj) {
                    matrixObj.setValue({fieldId: 'custrecord_dm_trans_impcted', value: tranImpctArr});
                    matrixObj.setValue({fieldId: 'custrecord_dm_prid_lvlid_flag', value: prLevelStr});
                    matrixObj.save();
                }
            }

        }

    }

    function getEncodedValue(tempString) {
        var encodedValue = encode.convert({
            string: tempString.toString(),
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64_URL_SAFE        
        });

        return encodedValue.toString();
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

    function _sendEmailToPOCreatorForInactiveEmployee(preparerId, currentRecObj, inactiveEmployeeName) {

        var bodyString = "";
        
        tranIdText = currentRecObj.getValue({fieldId: 'tranid'});

        var emailSubject = "PR# "+tranIdText+" approval process cancelled.";
        
        var emailToId = preparerId;
        var userName = 'User';
        var empObj = search.lookupFields({type: search.Type.EMPLOYEE, id: preparerId, columns: ["firstname"]});
        if(empObj) {
            userName = empObj.firstname;
        }

        bodyString += " <html>";
        bodyString += "     <body>";
        bodyString += "         Dear "+userName+",<br/><br/>Unfortunately we had to cancel the approval process for Purchase Order "+tranIdText+".<br/><br/>";
        bodyString += "         In the approval chain there is an employee record named "+inactiveEmployeeName+". The record for this employee is inactive in NetSuite.  With this we cannot submit the Purchase Request. Please reach out to ap@zume.com to discuss potential next steps  and reference the Purchase Order Number from above.";
        bodyString += "         <br/><br/>";
        bodyString += "         Please do the needful.";
        bodyString += "         <br/><br/>Thank you<br/>Zume Purchasing Team";
        bodyString += "     </body>";
        bodyString += " </html>";
        
        var emailObj = email.send({
            author: 62360,
            recipients: emailToId,
            subject: emailSubject,
            body: bodyString
        });
        

    }

    return {
        onRequest: onRequest
    }

});

