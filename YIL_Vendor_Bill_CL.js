/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * 
 */

define(["N/search", "N/record", "N/url", "N/https", "N/runtime"], function(search, record, url, https, runtime) {

    function pageInit(scriptContext) {

        var currentRecordObj = scriptContext.currentRecord;
        var mode = scriptContext.mode;
        
        console.log('mode -> '+mode);

        if(mode == 'create' || mode == 'copy') {
            if(currentRecordObj) {
                var poId = currentRecordObj.getValue({fieldId: 'custbody_ode_billcreatedfrom'});
                if(poId) {
                    var poObj = search.lookupFields({type: 'purchaseorder', id: poId, columns: ['custbody_requestor']});
                    if(poObj) {
                        if(poObj.custbody_requestor.length > 0) {
                            var requestorId = poObj.custbody_requestor[0].value;
                            if(requestorId) {
                                currentRecordObj.setValue({fieldId: 'custbody11_2', value: requestorId});
                            }
                        }
                    }
                }
                else {
                    currentRecordObj.setValue({fieldId: 'custbody10_2', value: ''});
                    
                }
                currentRecordObj.setValue({fieldId: 'custbody_pr_approval_flow', value: ''});
            }
        }
    }

    function lineInit(context) {
        
        //Bring Body Level Department and Class to Line Level Department and Class.
        var currentRecObj   = context.currentRecord;
        var billFromPo      = currentRecObj.getValue({fieldId: 'custbody_ode_billcreatedfrom'});
        var type            = context.sublistId;

        var bdDepartment    = currentRecObj.getValue({fieldId: 'department'});
        var bdClass         = currentRecObj.getValue({fieldId: 'class'});
        var internalId      = currentRecObj.id;
        var prApprovalFlowRec = currentRecObj.getValue({fieldId: 'custbody_pr_approval_flow'});

        if(!billFromPo && !prApprovalFlowRec && (type == 'item' || type == 'expense')) {
            
            if(!currentRecObj.getCurrentSublistValue({sublistId: type, fieldId: 'department'}) && bdDepartment != null) {
                currentRecObj.setCurrentSublistValue({sublistId: type, fieldId: 'department', value: bdDepartment});
            }
            if(!currentRecObj.getCurrentSublistValue({sublistId: type, fieldId: 'class'}) && bdClass != null) {
                currentRecObj.setCurrentSublistValue({sublistId: type, fieldId: 'class', value: bdClass});
            }   
        }
    }

    function fieldChanged(context) {
        //On requestor Selection, Populate the Department and Class of requestor.
        var currentRecObj   = context.currentRecord;
        var billFromPo      = currentRecObj.getValue({fieldId: 'custbody_ode_billcreatedfrom'});
        var internalId      = currentRecObj.id;
       
        //console.log(context.fieldId);
        
        if(!billFromPo && context.fieldId == "custbody11_2") {
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

        if(context.sublistId == "item") {

            var currentRecObj = context.currentRecord;
            var billFromPo      = currentRecObj.getValue({fieldId: 'custbody_ode_billcreatedfrom'});

            if(!billFromPo) {
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
            else if(billFromPo) {
                var orderLineVal = currentRecObj.getCurrentSublistValue({sublistId: context.sublistId, fieldId: 'orderline'});
                if(!orderLineVal) {
                    alert('You can not add new lines in this bill.');
                    return false;
                }

            }
            
        }

        return true;
    }

    function saveRecord(scriptContext) {

        var currentRecObj   = scriptContext.currentRecord;
        var currentBillId   = '';
        var poInternalId    = '';
        var billCreatorId   = '';
        var currentBillTotal = 0.00;
        var approvedBillTotal = 0.00;
        var poAmount            = 0.00;
        var poAmountWithTolerance = 0.00;
        var poAmountWithTolerancePerc = 0.00;
        var poAmountWithToleranceAmt = 0.00;
        var totalBillAmount = 0.00;
        var approvedBillItemTotal = 0.00;
        var approvedBillExpenseTotal = 0.00;

        if(currentRecObj) {
        
            currentBillTotal = currentRecObj.getValue({fieldId: 'total'});        
            log.debug("currentBillTotal: ",currentBillTotal);            
            currentBillId    = currentRecObj.id;
            poInternalId     = currentRecObj.getValue({fieldId: 'custbody_ode_billcreatedfrom'});
            billCreatorId    = currentRecObj.getValue({fieldId: 'custbody_creator'});
            var scriptObj = runtime.getCurrentScript();
            var paramExpCat = scriptObj.getParameter({name: 'custscript_exp_cat_exclude_frm_tolerance'});           
            log.debug("paramExpCat: ",paramExpCat);

            var expenseLineCount = currentRecObj.getLineCount('expense');
            log.debug('expenseLineCount :',expenseLineCount);        

            if(expenseLineCount)
            {
                for(var p = 0;p<expenseLineCount;p++)
                {            
                    //var finalStorageTemp = '';
                    currentRecObj.selectLine({sublistId: 'expense',line: p});
                    var LineExpense = currentRecObj.getSublistValue({sublistId: 'expense',fieldId: 'category',line: p});  
                    log.debug('LineExpense :',LineExpense); 
                    if(LineExpense == 53)   
                    {
                        var LineExpenseAmt = currentRecObj.getSublistValue({sublistId: 'expense',fieldId: 'amount',line: p}); 
                        currentBillTotal = currentBillTotal - Number(LineExpenseAmt);
                        log.debug('currentBillTotal In:',currentBillTotal); 
                    }            
                }
            }
            
            if(poInternalId) {

                var tolerancePerc = 0.0;
                var toleranceAmt =0.0;
                var baseTolerancePerc = 0.0;
                var currentVBSubsidy = currentRecObj.getValue({fieldId: 'subsidiary'});

                if(billCreatorId) {
                   // var empObj = search.lookupFields({type: 'employee', id: billCreatorId, columns: ['custentity_yil_alwd_toler_bill']});
                   // var empTolerance = empObj.custentity_yil_alwd_toler_bill;
                 //***************** Code added by Prashant Lokhande Date: 02/01/2020 ******************/  
                   var customrecord_yil_bill_toleranceSearchObj = search.create({
                    type: "customrecord_yil_bill_tolerance",
                    filters:
                    [
                       ["custrecord_yil_tolerance_subsidiary","anyof",currentVBSubsidy]
                    ],
                    columns:
                    [
                       search.createColumn({name: "custrecord_yil_tolerance_percentage", label: "Tolerance Percentage"}),
                       search.createColumn({name: "custrecord_yil_tolerance_amount", label: "Tolerance Amount"})
                    ]
                 });
                 var searchResultCount = customrecord_yil_bill_toleranceSearchObj.runPaged().count;
                 log.debug("customrecord_yil_bill_toleranceSearchObj result count",searchResultCount);
                 customrecord_yil_bill_toleranceSearchObj.run().each(function(result){
                    baseTolerancePerc = result.getValue({name: 'custrecord_yil_tolerance_percentage'});   
                    toleranceAmt = result.getValue({name: 'custrecord_yil_tolerance_amount'});
                    return true;
                 });
                 //***************** End Code added by Prashant Lokhande Date: 02/01/2020 ******************/  

                    if(baseTolerancePerc) {
                        if(baseTolerancePerc.indexOf("%") > 0) {
                            baseTolerancePerc = baseTolerancePerc.substring(0,baseTolerancePerc.length-1);
                        }
                        tolerancePerc = baseTolerancePerc;
                        //alert('tolerancePerc'+tolerancePerc);
                    }
                }
                //console.log('tolerancePerc -> '+tolerancePerc);
    
                if(poInternalId) {
                    var poObj = search.lookupFields({type: 'purchaseorder', id: poInternalId, columns: ['total']});
                    var poAmount = poObj.total;
                    if(poAmount) {
                        //poAmountWithTolerancePerc = Number(poAmount) + Number(poAmount*(tolerancePerc/100));
                        poAmountWithTolerancePerc = Number(poAmount*(tolerancePerc/100));
                        poAmountWithToleranceAmt = Number(toleranceAmt);
                        //alert('poAmountWithTolerancePerc = '+poAmountWithTolerancePerc);
                        //alert('poAmountWithToleranceAmt = '+poAmountWithToleranceAmt);

                        if(poAmountWithTolerancePerc < poAmountWithToleranceAmt)
                            poAmountWithTolerance = Number(poAmount) + Number(poAmountWithTolerancePerc);
                        else
                            poAmountWithTolerance = Number(poAmount) + Number(poAmountWithToleranceAmt);                            
                    }
                }
                //console.log('poAmount -> '+poAmount);
                //console.log('poAmountWithTolerance -> '+poAmountWithTolerance);
                
                var LineItem = '';
                var LineExpense = '';
                var billSearchFlt   = [];
                var billSearchClm   = [];
                
                if(currentBillId) { billSearchFlt.push(search.createFilter({name: 'internalid', operator: search.Operator.NONEOF, values: currentBillId})); }
                if(poInternalId)  { billSearchFlt.push(search.createFilter({name: 'custbody_ode_billcreatedfrom', operator: search.Operator.ANYOF, values: poInternalId}))};
                billSearchFlt.push(search.createFilter({name: 'mainline', operator: search.Operator.IS, values: false}));
                billSearchFlt.push(search.createFilter({name: 'approvalstatus', operator: search.Operator.NONEOF, values: 3}));
                
                //billSearchClm.push(search.createColumn({name: 'total', summary: search.Summary.SUM}));
                billSearchClm.push(search.createColumn({name: 'item'}));
                billSearchClm.push(search.createColumn({name: 'expensecategory'}));
                billSearchClm.push(search.createColumn({name: 'amount'}));
                    
                var billSearchRes = search.create({type: 'vendorbill', filters: billSearchFlt, columns: billSearchClm});   

                if(billSearchRes.runPaged().count > 0) {
    
                    billSearchRes.run().each(function(result) {
                        LineItem = result.getValue({name: 'item'});
                        //alert('LineItem = '+LineItem);
                        LineExpense = result.getValue({name: 'expensecategory'});
                        //alert('LineExpense = '+LineExpense);

                        if(LineItem)
                            approvedBillItemTotal += Number(result.getValue({name: 'amount'}));
                        if(LineExpense)
                            approvedBillExpenseTotal += Number(result.getValue({name: 'amount'}));    
                        //alert('approvedBillItemTotal = '+approvedBillItemTotal);
                        //alert('approvedBillExpenseTotal = '+approvedBillExpenseTotal);
                        return true;                
                    });
                    //alert('approvedBillItemTotalFinal = '+approvedBillItemTotal);
                    //alert('approvedBillExpenseTotalFinal = '+approvedBillExpenseTotal);
                    approvedBillTotal = Number(approvedBillItemTotal) + Number(approvedBillExpenseTotal);
    
                }//if(billSearchRes.runPaged().count > 0)
    
                //console.log('currentBillTotal -> '+currentBillTotal);
                //console.log('approvedBillTotal -> '+approvedBillTotal);
                //alert('currentBillTotal = '+currentBillTotal);
                //alert('approvedBillTotal = '+approvedBillTotal);
                totalBillAmount = Number(approvedBillTotal) + Number(currentBillTotal);                
                //alert('poAmountWithTolerance = '+poAmountWithTolerance);
                //alert('totalBillAmount = '+totalBillAmount);
                log.debug('totalBillAmount -> ',totalBillAmount);
                log.debug('poAmountWithTolerance -> ',poAmountWithTolerance);
                if(Number(totalBillAmount) > Number(poAmountWithTolerance)) {
                    alert("Vendor Bill over tolerance can not be created.");
                    return false;
                }
            }
        }
        return true;

    }

    function submitApprovalFun(recId) {
        
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

            var recObj = record.load({type: 'vendorbill', id: recId});
            if(recObj != null) {

                var departmentId    = recObj.getValue({fieldId: 'department'});
                var departmentIText = recObj.getText({fieldId: 'department'});
                var classId         = recObj.getValue({fieldId: 'class'});
                var classText       = recObj.getText({fieldId: 'class'});
                var lineCount       = recObj.getLineCount({sublistId: 'item'});
                var expLineCount    = recObj.getLineCount({sublistId: 'expense'});
                var requestorId     = recObj.getValue({fieldId: 'custbody11_2'});
                var preparerId      = recObj.getValue({fieldId: 'custbody_creator'});
                var billAmount      = recObj.getValue({fieldId: 'total'});

                if(!preparerId) {
                    errorMessage = "Please select the 'Preparer' field value in order to  submit for approval.";
                    errorEncountered = true;
                }

                if(!errorEncountered) {
                    if(!requestorId) {
                        errorMessage = "Please select the 'Custom Approver' field value in order to  submit for approval.";
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
    
                        //console.log('Reached Here');
                        //console.log('FPA Search Length - '+ fpaSearchRes.runPaged().count);
                        if(fpaSearchRes.runPaged().count > 0) {
                            
                            fpaSearchRes.run().each(function(result) {
                                //log.debug({title: "FP&A Approver", details: result.getValue({name: 'custrecord_fp_a_approver'})});
                                if(Number(billAmount) >= Number(fpaThresholdAmt)) {
                                    if(!fpaApproverId) {
                                       fpaApproverId = result.getValue({name: 'custrecord_fp_a_approver'});
                                    }
                                }
                                if(Number(billAmount) >= Number(hocThresholdAmt)) {
                                    if(!hocApproverId) {
                                        hocApproverId = result.getValue({name: 'custrecord_hoc_approver'});
                                    }
                                }
                                
                                return true;
                            });
                            if(Number(billAmount) > Number(fpaThresholdAmt)) {
                                if(!fpaApproverId) {
                                    errorEncountered    = true;
                                    errorMessage        = 'FP&A Approver is not defined for department "'+departmentIText+'" and class "'+classText+'". Please do the needful.';
                                }
                            }
                            if(Number(billAmount) > Number(hocThresholdAmt)) {
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
                /*
                    if(!errorEncountered) {
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
                        //console.log("buDprtClsAprvArr => "+buDprtClsAprvArr);
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
                    }
                    */
            }

            if(errorEncountered) {
                alert(errorMessage);
            }
            else {
                
                console.log('fpaApproverId -> '+fpaApproverId);
                console.log('hocApproverId -> '+hocApproverId);
                //console.log('buDprtClsAprvArr -> '+buDprtClsAprvArr);
                //alert('Reached Here..Good to process for submission.');
                var params = {'billId': recId, 'fpaapprover': fpaApproverId, 'hocapprover': hocApproverId};
                var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_bill_approval_flow_sl', deploymentId: 'customdeploy_yil_bill_approval_flow_sl', params: params});
                var response = https.get({url: suiteUrl});
                
                if(response.body == 'true') {
                    window.location.reload();
                }
                else {
                    alert(response.body);
                }

                //alert('Submit For Approval in Process...');
            }

        }

    }
    
    function approvePurchaseRequestFlow(recId, prAfId, nextLevel) {
        //alert('approve button in execution process');
        var param = {processFlag: 'a', prAfId: prAfId, recId: recId, nextLevel: nextLevel, fromrec: "1"};
        var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_bill_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_bill_apr_rej_can_ntf_sl', params: param});
        window.location.href = suiteUrl;
    }

    function rejectPurchaseRequestFlow(recId, prAfId, nextLevel) {
        //alert('reject button in execution process');
        var param = {processFlag: 'r', prAfId: prAfId, recId: recId, nextLevel: nextLevel, fromrec: "1"};
        var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_bill_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_bill_apr_rej_can_ntf_sl', params: param});
        window.location.href = suiteUrl;
    }

    function sendNotification(recId, prAfId) {
        //alert('send notification button in execution process');
        var param = {processFlag: 's', prAfId: prAfId, recId: recId};
        var suiteUrl = url.resolveScript({scriptId: 'customscript_yil_bill_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_bill_apr_rej_can_ntf_sl', params: param});
        var response = https.get({url: suiteUrl});
        console.log('Response -> '+response);
        console.log('Response -> '+response.body);
        if(response.body == 'true') {
            alert("Next approver(s) has been notified via email for their approval.");
        }
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        fieldChanged: fieldChanged,
        lineInit: lineInit,
        validateLine: validateLine,
        submitApprovalFun: submitApprovalFun,
        approvePurchaseRequestFlow: approvePurchaseRequestFlow,
        rejectPurchaseRequestFlow: rejectPurchaseRequestFlow,
        sendNotification: sendNotification
    }

});