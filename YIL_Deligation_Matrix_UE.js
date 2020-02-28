/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * 
 */

 define(["N/search", "N/record", "N/email", "N/encode", "N/url"], function(search, record, email, encode, url) {


    function afterSubmit(scriptContext) {

        var newRecObj   = scriptContext.newRecord;
        var oldRecObj   = scriptContext.oldRecord;
        var type        = scriptContext.type;
        var tranIdsLvlsObj = {prid: [], lvls: []};
        if(type == scriptContext.UserEventType.EDIT || type == scriptContext.UserEventType.XEDIT) {

            var newToEmp        = newRecObj.getValue({fieldId: 'custrecord_dm_to_emp'});
            var newFromEmpName  = newRecObj.getText({fieldId: 'custrecord_dm_by_emp'});
            var fromDate        = newRecObj.getValue({fieldId: 'custrecord_dm_from_date'});
            var toDate          = newRecObj.getValue({fieldId: 'custrecord_dm_to_date'});
            var oldToEmp        = oldRecObj.getValue({fieldId: 'custrecord_dm_to_emp'});
            var updatedCheck    = newRecObj.getValue({fieldId: 'custrecord_dm_updated'});
            var prLvlsIds       = newRecObj.getValue({fieldId: 'custrecord_dm_prid_lvlid_flag'})

            if(updatedCheck && (Number(newToEmp) != Number(oldToEmp)) && prLvlsIds) {

                var prLvlsIdsArr = [];
                prLvlsIdsArr = prLvlsIds.split(",");

                for(var p=0;p<prLvlsIdsArr.length;p++) {
                    if(prLvlsIdsArr[p]) {
                        var idLvsArr = prLvlsIdsArr[p].split(":");
                        var lvlsArr = idLvsArr[1].split("_");
                        tranIdsLvlsObj.prid.push(idLvsArr[0]);
                        tranIdsLvlsObj.lvls.push(lvlsArr);
                    }
                }

                //log.debug({title: 'tranIdsLvlsObj' , details: tranIdsLvlsObj});

                if(tranIdsLvlsObj.prid.length > 0) {

                    var prApprFlowSearchRes = search.load({id: 'customsearch_yil_pend_pr_daly_ntfctn'});
                    var prApprFlowSearchFlt = prApprFlowSearchRes.filterExpression;
                    prApprFlowSearchFlt.push("AND");
                    prApprFlowSearchFlt.push(['custrecord_purchase_req', 'anyof',tranIdsLvlsObj.prid]);
                    prApprFlowSearchRes.filterExpression = prApprFlowSearchFlt;
                    
                    log.debug({title: 'Search Result Length', details: prApprFlowSearchRes.runPaged().count});

                    if(prApprFlowSearchRes.runPaged().count > 0) {
                        
                        //log.debug({title: 'tranIdsLvlsObj.prid', details: tranIdsLvlsObj.prid});

                        var resultSet = prApprFlowSearchRes.run();
                        resultSet.each(function(result) {

                            var seaResPrId = result.getValue(resultSet.columns[1]);
                            var prAprvlId = result.id; 
                            
                            //log.debug({title: "PO&PRA", details: seaResPrId + " & " + prAprvlId});

                            if(seaResPrId) {
                                var indx = tranIdsLvlsObj.prid.indexOf(seaResPrId);
                                //log.debug({title: 'Index Avail', details: indx});
                                if(indx >= 0) {
                                    var tempLvsArr = tranIdsLvlsObj.lvls[indx];
                                    var emailLvls = '';
                                    var fldSubmtVals = "{";
                                    for(var l=0;l<tempLvsArr.length;l++) {
                                        var nxtLvsl = tempLvsArr[l];
                                        nxtLvsl = Number(nxtLvsl) + (8 * Number(nxtLvsl));
                                        var lvslStatus = result.getValue(resultSet.columns[nxtLvsl]);
                                        //log.debug({title: 'lvslStatus', details: lvslStatus});
                                        if(!lvslStatus || lvslStatus == 1) {
                                            var fieldId = "custrecord_approver_"+tempLvsArr[l];
                                            fldSubmtVals += "\""+fieldId +"\":"+ newToEmp;
                                            fldSubmtVals += ",";
                                            if(lvslStatus == 1) {
                                                //log.debug({title: 'email sent', details: 'Email Sent'});
                                                emailLvls = tempLvsArr[l];
                                            }
                                        }
                                    }
                                    fldSubmtVals = fldSubmtVals.substring(0,fldSubmtVals.length-1);
                                    
                                    if(fldSubmtVals) {
                                        fldSubmtVals += "}";
                                        //log.debug({title: 'fldSubmtVals', details: fldSubmtVals});
                                        var valuesObj = JSON.parse(fldSubmtVals.toString());
                                        //log.debug({title: "Object", details: valuesObj});
                                        try {
                                            var updatedPrId = record.submitFields({type: 'customrecord_pr_approval_flow', id: prAprvlId, values: valuesObj});
                                            log.debug({title: "updatedPrId", details: updatedPrId});
                                            log.debug({title: "emailLvls", details: emailLvls});
                                            if(emailLvls && updatedPrId) {
                                                _pendingApprovalEmailTemplateDelegated(seaResPrId, updatedPrId, [newToEmp], [emailLvls], newFromEmpName, fromDate, toDate);
                                            }
                                        }
                                        catch(err) {
                                            log.debug({title: "Error Encountered on Updating and Sending Email", details: err});
                                        }
                                        
                                    }
                                    
                                }
                            }

                            return true;
                        });
                    }

                }//if(tranIdsLvlsObj.prid.length > 0)

            }//if(Number(newToEmp) != Number(oldToEmp))

        }//if(type == scriptContext.UserEventType.EDIT || type == scriptContext.UserEventType.XEDIT)

    }

    function _pendingApprovalEmailTemplateDelegated(purchaseRequestId, updatedPRId, sendEmailTo, emailNxtLevelAtt, newFromEmpName, fromDate, toDate) {

        //Procurement, Zume Inc 62360
        //var fileObj = render.transaction({entityId: Number(purchaseRequestId), printMode: render.PrintMode.PDF, isCustLocale: true});
        var bodyString = "";
        var poTableString = "";
        var suiteletURL = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', returnExternalUrl: true});
        
        toDate.setDate(toDate.getDate() + 1);

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
        
        var emailSubject = "PR #"+tranIdText + " has been delegated to you for approval.";
        for(var s=0;s<sendEmailTo.length;s++) {
            var emailToId = sendEmailTo[s];
            var nextLevel = emailNxtLevelAtt[s];
            var userName = 'User';
            var empObj = search.lookupFields({type: search.Type.EMPLOYEE, id: emailToId, columns: ["firstname"]});
            if(empObj) {
                log.debug({title: "empObj", details: JSON.stringify(empObj)});
                userName = empObj.firstname;
            }

            //var param = {processFlag: 'a', prAfId: prAfId, recId: recId, nextLevel: nextLevel, fromrec: "1"};

            var approveURLParam = suiteletURL + '&processFlag=a&prAfId='+getEncodedValue(updatedPRId)+'&recId='+getEncodedValue(purchaseRequestId)+'&nextLevel='+getEncodedValue(nextLevel);
            var rejectURLParam = suiteletURL + '&processFlag=r&prAfId='+getEncodedValue(updatedPRId)+'&recId='+getEncodedValue(purchaseRequestId)+'&nextLevel='+getEncodedValue(nextLevel);

            bodyString += " <html>";
            bodyString += "     <body>";
            bodyString += "         Dear "+userName+",<br/><br/>A new PR has been delegated to you for approval by "+newFromEmpName+".";
            bodyString += "         <br/>";
            
            bodyString += "         <table>";
            bodyString += "         <tr><td>PR Number</td><td>:</td><td>"+tranIdText+"</td></tr>";
            bodyString += "         <tr><td>Requester</td><td>:</td><td>"+requestorName+"</td></tr>";
            bodyString += "         <tr><td>Preparer</td><td>:</td><td>"+preparerName+"</td></tr>";
            bodyString += "         <tr><td>Vendor</td><td>:</td><td>"+vendorName+"</td></tr>";
            bodyString += "         <tr><td>Total Amount</td><td>:</td><td>"+totalAmount+"</td></tr>";
            bodyString += "         <tr><td>Department</td><td>:</td><td>"+departnmentName+"</td></tr>";
            bodyString += "         <tr><td>Class</td><td>:</td><td>"+className+"</td></tr>";
            bodyString += "         <tr><td>Delegation Start Date</td><td>:</td><td>"+fromDate+"</td></tr>";
            bodyString += "         <tr><td>Delegation End Date</td><td>:</td><td>"+toDate+"</td></tr>";


            bodyString += "         </table>";
            bodyString += "         <br/><br/>";
            bodyString += poTableString;
            bodyString += "         <br/><br/>";
            bodyString += "         Please use below buttons to either <i><b>Approve</b></i> or <i><b>Reject</b></i> PR.";
            bodyString += "         <br/><br/>";
            bodyString += "         <b>Note:</b> Upon rejection system will ask for 'Reason for Rejection'.";

            bodyString += "         <br/><br/>";
            bodyString += "         <a href='"+approveURLParam+"'><img src='https://4879077.app.netsuite.com/core/media/media.nl?id=26195&c=4879077&h=2f16d2d13e3bc883893b&expurl=T' border='0' alt='Accept' style='width: 60px;'/></a>";
            bodyString += "         <a href='"+rejectURLParam+"'><img src='https://4879077.app.netsuite.com/core/media/media.nl?id=26194&c=4879077&h=57f894214bdc913b9da1&expurl=T' border='0' alt='Reject' style='width: 60px;'/></a>";
            bodyString += "         <br/><br/>Thank you<br/>Admin";
            bodyString += "     </body>";
            bodyString += " </html>";
            
            var emailObj = email.send({
                author: 62360,
                recipients: emailToId,
                subject: emailSubject,
                body: bodyString,
                relatedRecords: {transactionId: Number(purchaseRequestId)}
            });
        }
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
                            poTableString += "  <th><center><b>Quantity</b></center></th>";
                            poTableString += "  <th><center><b>Rate</b></center></th>";
                            poTableString += "  <th><center><b>Amount</b></center></th>";
                        poTableString += "</tr>";

                        for(var it=0;it<poItemLnCount;it++) {
                            
                            var srNo = Number(it) + 1;
                            var itemName        = prObj.getSublistText({sublistId: 'item', fieldId: 'item', line: it});
                            var lnDepartmentNam = prObj.getSublistText({sublistId: 'item', fieldId: 'department', line: it});
                            var lnClassNm       = prObj.getSublistText({sublistId: 'item', fieldId: 'class', line: it});
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
                                poTableString += "  <td align=\"center\">"+itemQty+"</td>";
                                poTableString += "  <td align=\"right\">"+itemRate+"</td>";
                                poTableString += "  <td align=\"right\">"+itemAmt+"</td>";
                            poTableString += "</tr>";

                        }//for(var it=0;it<poItemLnCount;it++)

                        itemTotalAmount = Number(itemTotalAmount).toFixed(2);

                        poTableString += "<tr>";
                            poTableString += "  <td align=\"right\" colspan=\"6\"><b>Total</b></td>";
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

    return {
        afterSubmit: afterSubmit
    }

 });