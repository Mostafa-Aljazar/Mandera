onRecordAfterUpdateSuccess((e) => {
  // Check if employee_id was assigned (changed from empty/null to a value)
  const oldEmployeeId = e.record.original().get("employee_id");
  const newEmployeeId = e.record.get("employee_id");
  
  // Only send email if employee_id was newly assigned or changed
  if (!newEmployeeId || newEmployeeId === oldEmployeeId) {
    e.next();
    return;
  }
  
  try {
    // Fetch the assigned employee details
    const employee = $app.findRecordById("company_employees", newEmployeeId);
    const employeeName = employee.get("name") || "Employee";
    const employeeEmail = employee.email();
    
    // Get property details
    const propertyTitle = e.record.get("title") || "Property";
    const propertyCode = e.record.get("code") || "";
    
    // Prepare email content in both Arabic and English
    const subject = `تعيين عقار جديد / New Property Assignment - ${propertyCode}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50; text-align: center;">تعيين عقار جديد</h2>
        <h2 style="color: #2c3e50; text-align: center;">New Property Assignment</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="font-size: 16px; line-height: 1.6;">
            <strong>مرحباً ${employeeName},</strong><br>
            تم تعيين عقار جديد لك: <strong>${propertyTitle}</strong>
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
            <strong>Hello ${employeeName},</strong><br>
            A new property has been assigned to you: <strong>${propertyTitle}</strong>
          </p>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="font-size: 14px; color: #6c757d;">
              رمز العقار / Property Code: <strong>${propertyCode}</strong>
            </p>
          </div>
        </div>
        
        <p style="font-size: 14px; color: #6c757d; text-align: center; margin-top: 30px;">
          يرجى تسجيل الدخول إلى النظام لعرض التفاصيل الكاملة<br>
          Please log in to the system to view full details
        </p>
      </div>
    `;
    
    // Create and send email
    const message = new MailerMessage({
      from: {
        address: "crm@mandera.site",
        name: "CRM System"
      },
      to: [{ address: employeeEmail }],
      subject: subject,
      html: htmlBody
    });
    
    $app.newMailClient().send(message);
    
  } catch (error) {
    console.error("Error sending property assignment email:", error);
    // Don't throw - allow the update to succeed even if email fails
  }
  
  e.next();
}, "properties");