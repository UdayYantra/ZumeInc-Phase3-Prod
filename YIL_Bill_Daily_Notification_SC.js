/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * 
 */

 define(["N/search", "N/email"], function(search, email) {

    var emailObject = {};
    emailObject.employeeId  = [];
    emailObject.employeeNm  = [];
    emailObject.purchOrdId  = [];
    emailObject.emailContent= [];

    function _getEmailObject() {

        var prSearch = search.load({
            id : "customsearch_yil_pend_bil_daly_ntfctn"
        });

        log.debug({title:'Bill Length', details: prSearch.runPaged().count});

        if(Number(prSearch.runPaged().count) > 0) {
            var resultSet = prSearch.run() ;
            resultSet.each(function(result) {
                
                var noOfLevels  = result.getValue(resultSet.columns[0]);
                var prIntrnlId  = result.getValue(resultSet.columns[1]);
                var rpTransId   = result.getValue(resultSet.columns[2]);
                var vendorName  = result.getText(resultSet.columns[3]);
                var preparer    = result.getValue(resultSet.columns[4]);
                var requester   = result.getText(resultSet.columns[5]);
                var prDate      = result.getValue(resultSet.columns[6]);
                var prAmount    = result.getValue(resultSet.columns[7]);
                noOfLevels = Number(Number(noOfLevels)*3) + 8;
                if(Number(noOfLevels) > 0) {
                    for(var i=8;i<Number(noOfLevels);i++) {
                        
                        var approverNm = result.getText(resultSet.columns[i]);
                        var approverId = result.getValue(resultSet.columns[i]); i++;
                        var approverStatus = result.getValue(resultSet.columns[i]); i++;

                        if(Number(approverStatus) == 1) {
                            
                            var templateStr = "<td align='center'>"+rpTransId+"</td><td align='left'>"+vendorName+"</td><td align='left'>"+preparer+"</td><td align='left'>"+requester+"</td><td align='center'>"+prDate+"</td><td align='right'>"+prAmount+"</td>";

                            if(emailObject.employeeId.length < 0) {
                                emailObject.employeeId.push(approverId);
                                emailObject.employeeNm.push(approverNm);
                                emailObject.purchOrdId.push([prIntrnlId]);
                                emailObject.emailContent.push(templateStr);
                            }
                            else {
                                var indx = emailObject.employeeId.indexOf(approverId);
                                if(indx < 0) {
                                    emailObject.employeeId.push(approverId);
                                    emailObject.employeeNm.push(approverNm);
                                    emailObject.purchOrdId.push([prIntrnlId]);
                                    emailObject.emailContent.push(templateStr);
                                }
                                else {
                                    var prevPrs = emailObject.purchOrdId[indx];
                                    if(prevPrs.indexOf(prIntrnlId) < 0) {
                                        prevPrs.push(prIntrnlId);
                                        emailObject.purchOrdId[indx] = prevPrs
                                        templateStr = emailObject.emailContent[indx] + "<br/>"+ templateStr;
                                        emailObject.emailContent[indx] = templateStr;
                                    }
                                }
                            }
                        }
                    }
                }
                return true;
            });

            /*log.debug({title: "employeeId", details: emailObject.employeeId});
            log.debug({title: "purchOrdId", details: emailObject.purchOrdId});
            log.debug({title: "emailContent", details: emailObject.emailContent});*/

        }
    }

    function _sendEmailsFromEmailObject() {
        if(emailObject.employeeId.length > 0) {
            for(var e=0;e<emailObject.employeeId.length;e++) {
                var recipientId = emailObject.employeeId[e];
                var recipientNm = emailObject.employeeNm[e];
                var emailOfPrs = emailObject.purchOrdId[e];
                var emailRows   = emailObject.emailContent[e];
                var emailRowsArr = []
                if(emailRows) {
                    emailRowsArr = emailRows.split("<br/>");
                }
                var currDt = new Date();

                var dt = currDt.getDate();
                var mn = currDt.getMonth();
                mn++;
                var yr = currDt.getFullYear();

                var currDtTxt = mn+"/"+dt+"/"+yr;

                var emailSubject = "Pending Bill Approval Notification: Bill(s) pending for your approval as on "+currDtTxt+".";
                var emailBody = "";
                
                emailBody += "<html>";
                    emailBody += "<body>";
                        emailBody += "Dear "+recipientNm+",";
                        emailBody += "<br/><br/>";
                        emailBody += "This is to bring to your notice that there "+emailRowsArr.length+" Bill(s) pending for your Approval.";
                        emailBody += "<br/><br/>";
                            emailBody += "<table border= '1' cellspacing='0' cellpadding='5'>";
                            emailBody += "<tr><th><center><b>Sr. No.</b></center></th><th><center><b>Bill Number</b></center></th><th><center><b>Vendor</b></center></th><th><center><b>Creator</b></center></th><th><center><b>Requester</b></center></th><th><center><b>Created Date</b></center></th><th><center><b>Amount</b></center></th></tr>";
                            for(var ec=0;ec<emailRowsArr.length;ec++) {
                                var srNo = Number(ec)+1;
                                emailBody += "<tr><td align='center'>"+srNo+"</td>"+emailRowsArr[ec]+"</tr>";
                            }
                            emailBody += "</table>";
                        emailBody += "<br/><br/>";
                        emailBody += "Thank you<br/>Admin.";

                    emailBody += "</body>";
                emailBody += "</html>";
                
                //Procurement, Zume Inc 62360
                log.debug({title: 'Email Send to', details: recipientId});
                log.debug({title: 'Email Send of Bill', details: emailOfPrs});
                var emailObj = email.send({
                    author: 62360,
                    recipients: recipientId,
                    subject: emailSubject,
                    body: emailBody,
                });

            }
        }//if(emailObject.employeeId.length > 0)
    }

    function execute(scriptContext) {
       
        _getEmailObject();

        _sendEmailsFromEmailObject();

    }

    return {
        execute: execute
    }

 });
