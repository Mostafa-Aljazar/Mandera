/// <reference path="../pb_data/types.d.ts" />

onRecordAfterUpdateSuccess((e) => {
  const record = e.record;
  const original = record.original();
  
  // Check if assigned_employee_id was changed
  const newEmployeeId = record.get("assigned_employee_id");
  const oldEmployeeId = original.get("assigned_employee_id");
  
  // Only send email if assigned_employee_id changed and is not empty
  if (newEmployeeId && newEmployeeId !== oldEmployeeId) {
    try {
      // Fetch the employee record to get their email and name
      const employee = $app.findRecordById("company_employees", newEmployeeId);
      
      if (employee) {
        const employeeEmail = employee.email();
        const employeeName = employee.get("name") || "الموظف";
        const ownerName = record.get("name") || "المالك";
        
        // Prepare bilingual email content
        const emailSubject = "تعيين مالك جديد / New Owner Assignment";
        const emailBody = `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>مرحباً ${employeeName}</h2>
            <p>تم تعيينك كمسؤول عن المالك: <strong>${ownerName}</strong></p>
            <p>يرجى متابعة هذا المالك والتواصل معه في أقرب وقت ممكن.</p>
            <hr style="margin: 30px 0;">
          </div>
          <div dir="ltr" style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hello ${employeeName}</h2>
            <p>You have been assigned as the responsible employee for the owner: <strong>${ownerName}</strong></p>
            <p>Please follow up with this owner and contact them as soon as possible.</p>
          </div>
        `;
        
        // Send the email
        const message = new MailerMessage({
          from: {
            address: "crm@mandera.site",
            name: "Mandera CRM"
          },
          to: [{ address: employeeEmail }],
          subject: emailSubject,
          html: emailBody
        });
        
        $app.newMailClient().send(message);
      }
    } catch (error) {
      console.error("Error sending owner assignment email:", error);
    }
  }
  
  e.next();
}, "owners");