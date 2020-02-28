/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * 
 */

define(['N/record', 'N/search'], 
    function(record, search) {

        function onAction(context) {

            log.debug({
                title: 'Start Script',
                details: 'Reached Here from Script Log'
            });
            
            
            try {
                
                var prRecordObj     = record.create({type:'customrecord_pr_approval_flow', isDynamic:true});
                var currentRecObj   = context.newRecord;
                var skipApproverArr = [];
                var nextLevelCount  = 1;
                var isPendApproval  = false;
                var sendEmailToArr  = [];

                var departClassArr  = [];
                var dprtClsAprvArr  = [];

                log.debug({title: 'Current Record Id', details: currentRecObj});
                if(prRecordObj != null && prRecordObj != 'undefined' && currentRecObj != null && currentRecObj != 'undefined') {
    
                    //*********************************************** Step 1 *******************************************************/
                            var requestorId = currentRecObj.getValue({fieldId: 'custbody_requestor'});
                            var preparerId  = currentRecObj.getValue({fieldId: 'employee'});
                            var departmentId    = currentRecObj.getValue({fieldId: 'department'});
                            var classId         = currentRecObj.getValue({fieldId: 'class'});
                            var lineCount       = currentRecObj.getLineCount({sublistId: 'item'});
                            if(Number(lineCount) > 0) {
                                departClassArr.push(departmentId+":"+classId);
                                dprtClsAprvArr.push(0);
                                for(var i=0;i<lineCount;i++) {
                                    var lnDeprtId   = currentRecObj.getSublistValue({sublistId: 'item', fieldId: 'department', line: i});
                                    var lnClasId    = currentRecObj.getSublistValue({sublistId: 'item', fieldId: 'class', line: i});
                                    var tmpStr = lnDeprtId + ":" + lnClasId;
                                    if(departClassArr.indexOf(tmpStr) < 0) {
                                        departClassArr.push(tmpStr);
                                        dprtClsAprvArr.push(0);
                                    }
                                }
                            }
                            
                            log.debug({title: 'requestorId', details: requestorId});
                            log.debug({title: 'preparerId', details: preparerId});

                            if(requestorId == preparerId) {

                                var nextApproverField       = "custrecord_approver_"+nextLevelCount;
                                var nextApprovalStatusField = "custrecord_approval_status_"+nextLevelCount;
                                var nextApprovalSkipField   = "custrecord_approval_skip_"+nextLevelCount;

                                prRecordObj.setValue({fieldId: nextApproverField, value: requestorId});
                                prRecordObj.setValue({fieldId: nextApprovalStatusField, value: 2});
                                prRecordObj.setValue({fieldId: nextApprovalSkipField, value: true});

                                skipApproverArr.push(requestorId);
                                nextLevelCount++;

                            }
                            else if(requestorId != preparerId) {
                                
                                var nextApproverField       = "custrecord_approver_"+nextLevelCount;
                                var nextApprovalStatusField = "custrecord_approval_status_"+nextLevelCount;
                                var nextApprovalSkipField   = "custrecord_approval_skip_"+nextLevelCount;

                                prRecordObj.setValue({fieldId: nextApproverField, value: requestorId});
                                prRecordObj.setValue({fieldId: nextApprovalStatusField, value: 1});

                                nextLevelCount++;
                                isPendApproval = true;
                                sendEmailToArr.push(requestorId);

                            }
                            
                            /*log.debug({title: 'nextLevelCount', details: nextLevelCount});
                            log.debug({title: 'isPendApproval', details: isPendApproval});
                            log.debug({title: 'sendEmailToArr', details: sendEmailToArr});*/

                    //*********************************************** Step 2 *******************************************************/
                            
                            var fpabuSearchFlt  = [];
                            var fpabuSearchClm  = [];
                            var fpabuSearchRes  = '';

                            fpabuSearchFlt.push(search.createFilter({name: 'custrecord_department', operator: search.Operator.ANYOF, values: departmentId}));
                            fpabuSearchFlt.push(search.createFilter({name: 'custrecord_class', operator: search.Operator.ANYOF, values: classId}));
                            fpabuSearchFlt.push(search.createFilter({name: 'isinactive', operator: search.Operator.IS, values: false}));
                            fpabuSearchClm.push(search.createColumn({name: 'custrecord_fp_a_approver'}));
                            fpabuSearchRes = search.create({type: 'customrecord_fpa_bu_approver', filters: fpabuSearchFlt, columns: fpabuSearchClm});

                            fpabuSearchRes.run().each(function(result) {
                                //log.debug({title: "FP&A Approver", details: result.getValue({name: 'custrecord_fp_a_approver'})});
                            });
                            
                    //*********************************************** Step 3 *******************************************************/
                    //*********************************************** Step 4 *******************************************************/
                    //*********************************************** Step 5 *******************************************************/
                    
                    
                    //var prId = prRecordObj.save();
                    //log.debug({title: 'PR Approval Id', details: prId});
    
                }//if(prRecordObj != null && prRecordObj != 'undefined')

            }
            catch(err) {
                log.debug({title:'Error Encountered on creation of Approval Flow',details: err});
            }

            

        }

        return {
            onAction: onAction
        }
        
    });