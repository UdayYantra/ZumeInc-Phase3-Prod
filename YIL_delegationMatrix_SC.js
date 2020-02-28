/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/runtime', 'N/format', 'N/url', 'N/encode', 'N/email'],

function(search, record, runtime, format, url, encode, email) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    
    var DelegationMatrix = {};        

  function getDelegationMatrixForReversed(){

    DelegationMatrix.IDForReversed = [];
    DelegationMatrix.byEmployeeForReversed = [];
    DelegationMatrix.toEmployeeForReversed = []; 
    DelegationMatrix.toEmployeeForReversedNm = []; 
    DelegationMatrix.transactionImpacted = []; 
    DelegationMatrix.prId_levelId = [];
    DelegationMatrix.prIds_Arr = [];
    DelegationMatrix.levelIds_Arr = [];
    DelegationMatrix.rfromDate = [];
    DelegationMatrix.rtoDate = [];

    var delegationMatrixSearchObj = search.create({

        type: "customrecord_delegation_matrix",
        filters:
        [
           ["custrecord_dm_to_date","on","yesterday"], 
             "AND", 
           ["custrecord_dm_updated","is","T"]                 
         
        ],
         columns:
         [
             search.createColumn({
                 name: "internalid",               
                 sort: search.Sort.ASC               
               }),
              search.createColumn({
                name: "custrecord_dm_prid_lvlid_flag"              
              }),
              search.createColumn({
                name: "custrecord_dm_to_emp"              
              }),
              search.createColumn({
                name: "custrecord_dm_by_emp"              
              }),
              search.createColumn({
                name: "custrecord_dm_to_date"              
              }),
              search.createColumn({
                name: "custrecord_dm_from_date"              
              }),
              search.createColumn({
                name: "custrecord_dm_trans_impcted"              
              }),
                 
          ]

    });   
        
        var searchResultCount = delegationMatrixSearchObj.runPaged().count;
        log.debug("****** delegationMatrixSearchObj result count ******",searchResultCount);
       
        delegationMatrixSearchObj.run().each(function(result){
        // .run().each has a limit of 4,000 results
     
          DelegationMatrix.IDForReversed.push(result.getValue({ name : 'internalid'}));
          DelegationMatrix.byEmployeeForReversed.push(result.getValue({ name : 'custrecord_dm_by_emp'}));
          DelegationMatrix.toEmployeeForReversed.push(result.getValue({ name : 'custrecord_dm_to_emp'}));
          DelegationMatrix.toEmployeeForReversedNm.push(result.getText({ name : 'custrecord_dm_to_emp'}));
          DelegationMatrix.transactionImpacted.push(result.getValue({ name : 'custrecord_dm_trans_impcted'}));
          DelegationMatrix.rfromDate.push(result.getValue({ name : 'custrecord_dm_from_date'}));
          DelegationMatrix.rtoDate.push(result.getValue({ name : 'custrecord_dm_to_date'}));

          var prIdsLvls = result.getValue({ name : 'custrecord_dm_prid_lvlid_flag'});
          DelegationMatrix.prId_levelId.push(prIdsLvls);
          if(prIdsLvls) {
            var prIdsArr = [];
            var lvlArrs = [];
            var tempArr = prIdsLvls.split(",");
            for(var ind=0;ind<tempArr.length;ind++) {
              var idLvls = tempArr[ind];
              var sepArr = idLvls.split(":");
              prIdsArr.push(sepArr[0]);
              lvlArrs.push(sepArr[1].split("_"));
            }
            if(prIdsArr && lvlArrs) {
              DelegationMatrix.prIds_Arr.push(prIdsArr);
              DelegationMatrix.levelIds_Arr.push(lvlArrs);
            }
          }

           //log.debug("****** result.getValue({ name : 'custrecord_dm_trans_impcted'}) ******",result.getValue({ name : 'custrecord_dm_trans_impcted'}));
          return true;
       });
       
       // DelegationMatrix.transactionImpacted.push('1212');
        log.debug("****** DelegationMatrix.prId_levelId ******",DelegationMatrix);
  }



  function getDelegationMatrix(){
    DelegationMatrix.ID = [];
    DelegationMatrix.byEmployee = [];
    DelegationMatrix.byEmployeeNm = [];
    DelegationMatrix.toEmployee = [];   
    DelegationMatrix.fromDate = [];   
    DelegationMatrix.toDate = [];   


    var inventorydetailSearchObj = search.create({
        type: "customrecord_delegation_matrix",
        filters:
        [
           ["custrecord_dm_from_date","on","today"], 
             "AND", 
           ["custrecord_dm_updated","is","F"], 
                  "AND", 
           ["custrecord_dm_trans_impcted","anyof","@NONE@"]
         
        ],
        
        columns:
         [
             search.createColumn({
                 name: "internalid",               
                 sort: search.Sort.ASC               
               }),
              search.createColumn({
                name: "custrecord_dm_by_emp"              
              }),
              search.createColumn({
                name: "custrecord_dm_to_emp"              
              }),
              search.createColumn({
                name: "custrecord_dm_to_date"              
              }),
              search.createColumn({
                name: "custrecord_dm_trans_impcted"              
              }),
              search.createColumn({
                name: "custrecord_dm_from_date"              
              })
                 
          ]
        });
        var searchResultCount = inventorydetailSearchObj.runPaged().count;
        log.debug("****** inventorydetailSearchObj result count ******",searchResultCount);

         inventorydetailSearchObj.run().each(function(result){
        // .run().each has a limit of 4,000 results
                
          DelegationMatrix.ID.push(result.getValue({ name : 'internalid'}));
          DelegationMatrix.byEmployee.push(result.getValue({ name : 'custrecord_dm_by_emp'}));
          DelegationMatrix.byEmployeeNm.push(result.getText({ name : 'custrecord_dm_by_emp'}));
          DelegationMatrix.toEmployee.push(result.getValue({ name : 'custrecord_dm_to_emp'}));
          DelegationMatrix.fromDate.push(result.getValue({ name : 'custrecord_dm_from_date'}));
          DelegationMatrix.toDate.push(result.getValue({ name : 'custrecord_dm_to_date'}));

         return true;
       });

  }

  function reversed_UpdatePRApprovalFlow(){

    try{

          for( var del = 0 ; del < DelegationMatrix.IDForReversed.length; del++){

              if(!DelegationMatrix.transactionImpacted[del])
                return;
               var a_po =  DelegationMatrix.transactionImpacted[del].split(',');
              //log.debug({  title: ' onRequest', details:'a_po '+a_po});
              var a_reverseTransaction = new Array(); // to store the transactions which needs to be reversed.

               if(!DelegationMatrix.prId_levelId[del])
                return;
              var temp_poID_LevelId = DelegationMatrix.prId_levelId[del].split(',');
              //log.debug({  title: ' onRequest', details:'temp_poID_LevelId '+temp_poID_LevelId});
              //temp_poID_LevelId.toString();
              // log.debug({  title: ' onRequest', details:'temp_poID_LevelId string'+temp_poID_LevelId});
              var poID_LevelId = temp_poID_LevelId.toString().split(':');
             // log.debug({  title: ' onRequest', details:'poID_LevelId '+poID_LevelId});
              var temp_POLevelId = poID_LevelId.toString().split(',');
             // log.debug({  title: ' onRequest', details:'temp_POLevelId '+temp_POLevelId});
              // create the saved search to get the PR approval record to update and 
               var prapproval_SearchObj = search.load({
                      id : "customsearch_pr_pending_approval_del"
                   });
               //Copy the filters from objSearch into defaultFilters
              var defaultFilters = prapproval_SearchObj.filters;

              if(a_po != '' && a_po != undefined && a_po != null){
                   var custFilter = search.createFilter({
                   name: 'custrecord_purchase_req',
                   operator: search.Operator.ANYOF,
                   values : a_po
               });
               //We will push the myFilter into defaultFilters
               defaultFilters.push(custFilter);
              }
              prapproval_SearchObj.filters = defaultFilters;
              var searchResultCount = prapproval_SearchObj.runPaged().count;
              log.debug("****** prapproval_SearchObj result count ******",searchResultCount);
              prapproval_SearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results

                 //get the internal id of PR approval record. 
                
                var internalId_PRApproval = result.getValue({ name : 'internalid'})
                //log.debug("****** internalId_PRApproval ******",internalId_PRApproval);     
                // store the transaction to get reversed.
                var purchaseRequestId = result.getValue({ name : 'custrecord_purchase_req'});
                a_reverseTransaction.push(purchaseRequestId);

                 if(internalId_PRApproval){
                    var prApproval_Obj = record.load({type:"customrecord_pr_approval_flow", id: parseInt(internalId_PRApproval), isDynamic: true });


                    //loop through the 50 different level fields
                    /*for(var inn = 0 ; inn < temp_POLevelId.length ; inn++){
                        
                        // check the PO matching PO to get the levelk Id and update it
                        if(temp_POLevelId[inn] == result.getValue({ name : 'custrecord_purchase_req'}) ){
                        //  log.debug("****** poID_LevelId[inn]******",temp_POLevelId[inn]); 
                            var levelNo = temp_POLevelId[++inn];
                           // log.debug("*****levelNo******",levelNo); 
                            if(levelNo){

                                var approverFieldId = 'custrecord_approver_'+levelNo;
                               // var approvalStatusId = 'custrecord_approval_status_'+levelNo;
                                prApproval_Obj.setValue({fieldId: approverFieldId.toString(), value: DelegationMatrix.byEmployeeForReversed[del]});  

                            }

                        }
                     
                      //  inn++; // incremented twice to iterate through only PO number and not by the levek ID
                       // break;
                    }*/

                    var tempIndex = DelegationMatrix.prIds_Arr[del].indexOf(purchaseRequestId);
                    if(tempIndex >= 0) {
                      var lvlsArr = DelegationMatrix.levelIds_Arr[0][tempIndex];
                      //log.debug({title: 'lvlsArr['+tempIndex+']', details: lvlsArr});
                      for(var l=0;l<lvlsArr.length;l++) {
                        var approverFieldId = 'custrecord_approver_'+lvlsArr[l];
                        var approvalStatusId = 'custrecord_approval_status_'+lvlsArr[l];
                        var approvalStatusIdVal = prApproval_Obj.getValue({fieldId: approvalStatusId.toString()});
                        if(!approvalStatusIdVal || approvalStatusIdVal == 1) {
                          prApproval_Obj.setValue({fieldId: approverFieldId.toString(), value: DelegationMatrix.byEmployeeForReversed[del]});  
                          if(approvalStatusIdVal == 1) {
                            _pendingApprovalEmailTemplateReverseDelegated(purchaseRequestId, internalId_PRApproval, [DelegationMatrix.byEmployeeForReversed[del]], [lvlsArr[l]], DelegationMatrix.toEmployeeForReversedNm[del], DelegationMatrix.rfromDate[del], DelegationMatrix.rtoDate[del]);
                          }
                        }
                      }
                    }

                    // save the updated PR approval record
                    var pr_recordId = prApproval_Obj.save({ enableSourcing: true, ignoreMandatoryFields: true});
                    log.debug({ title: 'updated pr approval record id', details: 'pr_recordId'+pr_recordId});
                  }         
              
                 return true;
            });

            //update the delegation matrix record
            if(a_reverseTransaction){
              var delegationMatrix_Obj = record.load({type:"customrecord_delegation_matrix", id: parseInt(DelegationMatrix.IDForReversed[del]), isDynamic: true });
              delegationMatrix_Obj.setValue({fieldId: "custrecord_dm_reverse_trans", value: a_reverseTransaction});             
              var delmat_recordId = delegationMatrix_Obj.save({ enableSourcing: true, ignoreMandatoryFields: true});
              log.debug({ title: 'updated delmat_recordId record id', details: 'delmat_recordId'+delmat_recordId});
            }


          }
    

    }catch(e){

        log.error({ title: e.name, details: e.message});
    }


  }

function updatePRApprovalFlow(){

  try{
        // loop to go through all the delegation matrix record
        for(var del = 0 ; del< DelegationMatrix.ID.length; del++){
          var prIdLevelId = '';
            // load the PR Approval Flow search with search id 'customsearch_pr_pending_approval_del' // need to chnange the search id
           var pr_approval_flowSearchObj = search.load({
                  id : "customsearch_pr_pending_approval_del"
               });
           var a_affectedTran = [];
           var flt = [2,3];
          //Copy the filters from objSearch into defaultFilters
           // var defaultFilters = pr_approval_flowSearchObj.filters;
           //get the filter expression
           var defaultFilters_Exp = pr_approval_flowSearchObj.filterExpression;
           if(defaultFilters_Exp.length > 0){
                 defaultFilters_Exp.push('AND');
             }
            log.debug({  title: ' onRequest', details:'defaultFilters_Exp '+defaultFilters_Exp});
            //loop to go through all the 50 leavels of PR approval flow
           for(var i=1 ; i <= 50 ; i++){
               var approverFieldId = 'custrecord_approver_'+i;
               var approvalStatusId = 'custrecord_approval_status_'+i;
               defaultFilters_Exp.push([approverFieldId.toString(), "anyof", DelegationMatrix.byEmployee[del], "AND", [approvalStatusId.toString(), "anyof",["@NONE@", "1"]]]);  
               if(i != 50) {
                  defaultFilters_Exp.push('OR');
               }
           }

           defaultFilters_Exp.push(defaultFilters_Exp);
           log.debug({  title: ' onRequest', details:'defaultFilters_Exp '+defaultFilters_Exp.pop()});
           pr_approval_flowSearchObj.filterExpression  =  defaultFilters_Exp;
           var searchResultCount = pr_approval_flowSearchObj.runPaged().count;
           log.debug("****** pr_approval_flowSearchObj result count ******",searchResultCount);

            pr_approval_flowSearchObj.run().each(function(result){
              // .run().each has a limit of 4,000 results

              //get the internal id of PR approval record. 
              // load it to match with delegation by employee and update the value to delegate to employee.
              var internalId_PRApproval = result.getValue({ name : 'internalid'})
              
              
              if(internalId_PRApproval){
                  var prApproval_Obj = record.load({type:"customrecord_pr_approval_flow", id: parseInt(internalId_PRApproval), isDynamic: true });
                  var purchaseRequestId = prApproval_Obj.getValue({fieldId: "custrecord_purchase_req"});
                  var noOfLevels = prApproval_Obj.getValue({fieldId: "custrecord_no_of_level"});
                  log.debug("****** internalId_PRApproval ******",internalId_PRApproval);     
                  
                  
                  
                  
                  var lvls = '';
                  //loop through the 50 different level fields
                  for(var inn = 1 ; inn <= Number(noOfLevels) ; inn++){
                      var approverFieldId = "custrecord_approver_"+inn;
                      var approvalStatusId = 'custrecord_approval_status_'+inn;
                        
                      var levelApprover = prApproval_Obj.getValue({fieldId: approverFieldId.toString() }); //approverFieldId.toString()
                      var levelApproverStatus = prApproval_Obj.getValue({fieldId: approvalStatusId.toString()}); //
                      
                      if(levelApprover == DelegationMatrix.byEmployee[del] && (levelApproverStatus == 1 || !levelApproverStatus)) {
                        prApproval_Obj.setValue({fieldId: approverFieldId.toString(), value: DelegationMatrix.toEmployee[del]});
                        a_affectedTran.push(prApproval_Obj.getValue({fieldId: "custrecord_purchase_req"}));
                        if(lvls) {
                          lvls += "_";
                        }
                        lvls += inn;
                        if(levelApproverStatus == 1) {
                          _pendingApprovalEmailTemplateDelegated(purchaseRequestId, internalId_PRApproval, [DelegationMatrix.toEmployee[del]], [inn], DelegationMatrix.byEmployeeNm[del], DelegationMatrix.fromDate[del], DelegationMatrix.toDate[del]);
                        }
                      }
                    // break;
                  }
                  if(lvls) {
                    if(prIdLevelId) {
                      prIdLevelId += ",";
                    }
                    prIdLevelId += purchaseRequestId + ":" + lvls;
                  }

                  // save the updated PR approval record
                  var pr_recordId = prApproval_Obj.save({ enableSourcing: true, ignoreMandatoryFields: true});
                  //log.debug({ title: 'updated pr approval record id', details: 'pr_recordId'+pr_recordId});
                }          
            
              return true;
            });

            //update the delegation matrix record
            if(a_affectedTran){
              var delegationMatrix_Obj = record.load({type:"customrecord_delegation_matrix", id: parseInt(DelegationMatrix.ID[del]), isDynamic: true });
              delegationMatrix_Obj.setValue({fieldId: "custrecord_dm_trans_impcted", value: a_affectedTran});
              delegationMatrix_Obj.setValue({fieldId: "custrecord_dm_updated", value: true});
              delegationMatrix_Obj.setValue({fieldId: "custrecord_dm_prid_lvlid_flag", value:prIdLevelId});
              var delmat_recordId = delegationMatrix_Obj.save({ enableSourcing: true, ignoreMandatoryFields: true});
              log.debug({ title: 'updated delmat_recordId record id', details: 'delmat_recordId'+delmat_recordId});
            }


        }

  }catch(e){
    log.error({ title: e.name, details: e.message});
  }

}





  /**
    * Reschedules the current script and returns the ID of the reschedule task
  */
  function rescheduleCurrentScript(index) {
    var scheduledScriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT });
      scheduledScriptTask.scriptId = runtime.getCurrentScript().id;
      scheduledScriptTask.deploymentId = runtime.getCurrentScript().deploymentId;
      scheduledScriptTask.params = {custscript_index:index};
      return scheduledScriptTask.submit();
  }

	function execute(scriptContext) {
    
    try{

        /*
         *   This script will run every day to update the Delegation matrix custom record.
         *  The script will update the PR approval flow record with the delegated to Employee from Delegation Employee.
         *  Also, will update the Transactions impacted and Reverse Transaction. 
        */

       // step 1: get the Delegation matrix custom record which needs to get updated today.
       // create a saved search to get the values with filters 1. from date should be today, 2. updated checked box unchecked and 3. Transaction impacted is blank.

        getDelegationMatrix();


        //Step 2: Update the delef=gate to with delegate by employe for approval of PO.
        // Udpdate the transaction affected by the delegate by employee. which are pending approval by employee.

        updatePRApprovalFlow();

        //step 3: Get the delegation matrix custom record which needs to gets reversed and todate is from.
        //create a saved seach to delegation matrix with filters. todate is yesterday and isupdate is true.
        getDelegationMatrixForReversed();

        //step 4: update the PR Approval flow custom record.
         reversed_UpdatePRApprovalFlow();
       
      }catch(e){
        log.error({ title: e.name, details: e.message});
      }
    	
  }

  function _pendingApprovalEmailTemplateDelegated(purchaseRequestId, updatedPRId, sendEmailTo, emailNxtLevelAtt, newFromEmpName, fromDate, toDate) {

      //Procurement, Zume Inc 49191
      //var fileObj = render.transaction({entityId: Number(purchaseRequestId), printMode: render.PrintMode.PDF, isCustLocale: true});
      var bodyString = "";
      var poTableString = "";
      var suiteletURL = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', returnExternalUrl: true});
      
      //toDate.setDate(toDate.getDate() + 1);

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
          bodyString += "         <a href='"+approveURLParam+"'><img src='http://shopping.na0.netsuite.com/core/media/media.nl?id=16030&c=4879077_SB1&h=96a3cf9a7b52344b900a' border='0' alt='Accept' style='width: 60px;'/></a>";
          bodyString += "         <a href='"+rejectURLParam+"'><img src='http://shopping.na0.netsuite.com/core/media/media.nl?id=16029&c=4879077_SB1&h=e05cf731ab1ecfb3cdbc' border='0' alt='Reject' style='width: 60px;'/></a>";
          bodyString += "         <br/><br/>Thank you<br/>Admin";
          bodyString += "     </body>";
          bodyString += " </html>";
          
          var emailObj = email.send({
              author: 49191,
              recipients: emailToId,
              subject: emailSubject,
              body: bodyString,
              relatedRecords: {transactionId: Number(purchaseRequestId)}
          });
      }
  }

  function _pendingApprovalEmailTemplateReverseDelegated(purchaseRequestId, updatedPRId, sendEmailTo, emailNxtLevelAtt, newFromEmpName, fromDate, toDate) {

      //Procurement, Zume Inc 49191
      //var fileObj = render.transaction({entityId: Number(purchaseRequestId), printMode: render.PrintMode.PDF, isCustLocale: true});
      var bodyString = "";
      var poTableString = "";
      var suiteletURL = url.resolveScript({scriptId: 'customscript_yil_pr_apr_rej_can_ntf_sl', deploymentId: 'customdeploy_yil_pr_apr_rej_can_ntf_sl', returnExternalUrl: true});
      
      //toDate.setDate(toDate.getDate() + 1);

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
      
      var emailSubject = "PR #"+tranIdText + " has been assigned back to you for approval.";
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
          bodyString += "         Dear "+userName+",<br/><br/>An existing PR has been assigned back to you for approval from "+newFromEmpName+".";
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
          bodyString += "         <a href='"+approveURLParam+"'><img src='http://shopping.na0.netsuite.com/core/media/media.nl?id=16030&c=4879077_SB1&h=96a3cf9a7b52344b900a' border='0' alt='Accept' style='width: 60px;'/></a>";
          bodyString += "         <a href='"+rejectURLParam+"'><img src='http://shopping.na0.netsuite.com/core/media/media.nl?id=16029&c=4879077_SB1&h=e05cf731ab1ecfb3cdbc' border='0' alt='Reject' style='width: 60px;'/></a>";
          bodyString += "         <br/><br/>Thank you<br/>Admin";
          bodyString += "     </body>";
          bodyString += " </html>";
          
          var emailObj = email.send({
              author: 49191,
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
     execute: execute
  };
    
});



