  /**
   * @NApiVersion 2.x
   * @NScriptType ClientScript
   */
   
define(['N/url','N/search','N/ui/message'], function (url,search,message) {

   
    function validateApprovers(fapuDepartmentId, fpaBuClassId, currentId){
      
      var fpa_bu_approver_SearchFlt = [];
      fpa_bu_approver_SearchFlt.push(["custrecord_department","anyof",fapuDepartmentId]);
      fpa_bu_approver_SearchFlt.push("AND");
      fpa_bu_approver_SearchFlt.push(["custrecord_class","anyof",fpaBuClassId]);
      if(currentId) {
        fpa_bu_approver_SearchFlt.push("AND");
        fpa_bu_approver_SearchFlt.push(["internalid","noneof",currentId]);
      }
      var fpa_bu_approver_SearchObj = search.create({
        type: "customrecord_fpa_bu_approver",
          filters: fpa_bu_approver_SearchFlt,
           columns:
           [
               search.createColumn({
                   name: "internalid",               
                   sort: search.Sort.ASC               
                 })
                   
            ]

       });   
      var searchResultCount = fpa_bu_approver_SearchObj.runPaged().count;
    
      if(searchResultCount > 0)
        return true;
      else
        return false;


   }

     function validateDesignation(designation, currentId){

      var titldesignation_SearchFlt = [];
      titldesignation_SearchFlt.push(["custrecord_ba_desgination","is",designation]);
      if(currentId) {
        titldesignation_SearchFlt.push("AND");
        titldesignation_SearchFlt.push(["internalid","noneof",currentId]);
      }
        var titldesignation_SearchObj = search.create({
          type: "customrecord_budget_approvers",
            filters: titldesignation_SearchFlt,
             columns:
             [
                 search.createColumn({
                     name: "internalid",               
                     sort: search.Sort.ASC               
                   })
                     
              ]

         });   
        var searchResultCount = titldesignation_SearchObj.runPaged().count;
      if(searchResultCount > 0)
        return true;
      else
        return false;

     }


   function saveRecord(context) {
      try{
          
          var recCust = context.currentRecord;
          var currentId = recCust.id;
          var fapuDepartmentId = recCust.getValue({ fieldId : 'custrecord_department'});
          var fpaBuClassId = recCust.getValue({ fieldId : 'custrecord_class'});
          var designation = recCust.getValue({ fieldId : 'custrecord_ba_desgination'});
          
          if(designation){
              var isdesignaionAvailable = validateDesignation(designation, currentId);
              if(isdesignaionAvailable){
                 alert('Title Approver with selected designation is already present.');
                 return false;
              }
          }

          // function to check if record already exist for same approvers
          if(fapuDepartmentId && fpaBuClassId){
             var isAvailable = validateApprovers(fapuDepartmentId, fpaBuClassId, currentId);
             
             if(isAvailable){
                alert('FPA Approver and BU approver already present for selected \'Department\' and \'Class\' combination.');
                return false;
             }

          }
      
      }
    catch (e){
        var errString =  e.name + ' : ' + e.type + ' : ' + e.message;
        log.error({ title: 'saveRecord', details: errString });
      }
      return true;
    }


      return {
           
           saveRecord: saveRecord          
         
      };

  });




