onRecordAfterUpdateSuccess((e) => {
  e.next();
  
  // Check if employee_id was set (client assigned to employee)
  const newEmployeeId = e.record.get("employee_id");
  const oldEmployeeId = e.record.original().get("employee_id");
  
  // Only send email if employee_id changed and is now set
  if (!newEmployeeId || newEmployeeId === oldEmployeeId) {
    return;
  }
  
  try {
    // Fetch employee details
    const employee = $app.findRecordById("company_employees", newEmployeeId);
    const employeeEmail = employee.email();
    const employeeName = employee.get("name") || "Employee";
    
    // Get client details
    const clientName = e.record.get("name") || "Client";
    const clientPhone = e.record.get("phone") || "N/A";
    const clientInterestType = e.record.get("interest_type") || "N/A";
    
    // Create bilingual email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ltr;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Client Assignment Notification</h2>
        
        <p>Dear <strong>${employeeName}</strong>,</p>
        
        <p>A new client has been assigned to you. Please review the details below:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Client Name:</strong> ${clientName}</p>
          <p><strong>Phone:</strong> ${clientPhone}</p>
          <p><strong>Interest Type:</strong> ${clientInterestType}</p>
        </div>
        
        <p>Please follow up with this client at your earliest convenience.</p>
        
        <p>Best regards,<br>CRM System</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <div style="direction: rtl; text-align: right;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">إشعار تعيين عميل</h2>
          
          <p>عزيزي/عزيزتي <strong>${employeeName}</strong>،</p>
          
          <p>تم تعيين عميل جديد لك. يرجى مراجعة التفاصيل أدناه:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>اسم العميل:</strong> ${clientName}</p>
            <p><strong>الهاتف:</strong> ${clientPhone}</p>
            <p><strong>نوع الاهتمام:</strong> ${clientInterestType}</p>
          </div>
          
          <p>يرجى المتابعة مع هذا العميل في أقرب وقت ممكن.</p>
          
          <p>مع أطيب التحيات،<br>نظام إدارة علاقات العملاء</p>
        </div>
      </div>
    `;
    
    // Send email
    const message = new MailerMessage({
      from: {
        address: "crm@mandera.site",
        name: "CRM System"
      },
      to: [{ address: employeeEmail }],
      subject: "Client Assignment Notification | إشعار تعيين عميل",
      html: htmlContent
    });
    
    $app.newMailClient().send(message);
    
  } catch (error) {
    console.error("Failed to send client assignment email:", error);
  }
}, "clients");