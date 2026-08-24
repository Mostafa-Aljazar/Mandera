import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { employeeDisplayName } from "@/lib/bilingualLabel";

const FROM_ADDRESS = "CRM System <crm@mandera.site>";

type AssignmentEntityType = "client" | "owner" | "property";

interface SendAssignmentNotificationInput {
  entityType: AssignmentEntityType;
  employeeId: string;
  entityName: string;
  detailLines: { labelEn: string; labelAr: string; value: string }[];
}

const SUBJECTS: Record<AssignmentEntityType, string> = {
  client: "Client Assignment Notification | إشعار تعيين عميل",
  owner: "Owner Assignment Notification | إشعار تعيين مالك",
  property: "Property Assignment Notification | إشعار تعيين عقار",
};

const TITLES_EN: Record<AssignmentEntityType, string> = {
  client: "Client Assignment Notification",
  owner: "Owner Assignment Notification",
  property: "Property Assignment Notification",
};

const TITLES_AR: Record<AssignmentEntityType, string> = {
  client: "إشعار تعيين عميل",
  owner: "إشعار تعيين مالك",
  property: "إشعار تعيين عقار",
};

const INTRO_EN: Record<AssignmentEntityType, string> = {
  client: "A new client has been assigned to you. Please review the details below:",
  owner: "A new owner has been assigned to you. Please review the details below:",
  property: "A new property has been assigned to you. Please review the details below:",
};

const INTRO_AR: Record<AssignmentEntityType, string> = {
  client: "تم تعيين عميل جديد لك. يرجى مراجعة التفاصيل أدناه:",
  owner: "تم تعيين مالك جديد لك. يرجى مراجعة التفاصيل أدناه:",
  property: "تم تعيين عقار جديد لك. يرجى مراجعة التفاصيل أدناه:",
};

const OUTRO_EN = "Please follow up with this at your earliest convenience.";
const OUTRO_AR = "يرجى المتابعة في أقرب وقت ممكن.";

const BADGE_EN: Record<AssignmentEntityType, string> = {
  client: "New Client",
  owner: "New Owner",
  property: "New Property",
};

const BADGE_AR: Record<AssignmentEntityType, string> = {
  client: "عميل جديد",
  owner: "مالك جديد",
  property: "عقار جديد",
};

const NAVY = "#0f172a";
const ACCENT = "#2563eb";
const BORDER = "#e2e8f0";
const MUTED = "#64748b";
const TEXT = "#1e293b";

function detailTable(
  lines: SendAssignmentNotificationInput["detailLines"],
  label: (l: SendAssignmentNotificationInput["detailLines"][number]) => string,
  align: "left" | "right",
) {
  const rows = lines
    .map(
      (line, i) => `
        <tr>
          <td style="padding: 12px 18px; ${i > 0 ? `border-top: 1px solid ${BORDER};` : ""} font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: ${MUTED}; text-align: ${align}; white-space: nowrap; width: 1%;">
            ${label(line)}
          </td>
          <td style="padding: 12px 18px; ${i > 0 ? `border-top: 1px solid ${BORDER};` : ""} font-size: 14px; color: ${TEXT}; text-align: ${align};">
            <strong>${line.value}</strong>
          </td>
        </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid ${BORDER}; border-radius: 10px; margin: 22px 0; border-collapse: collapse; overflow: hidden;">
      ${rows}
    </table>`;
}

function section(opts: {
  dir: "ltr" | "rtl";
  align: "left" | "right";
  badge: string;
  title: string;
  greeting: string;
  intro: string;
  table: string;
  outro: string;
  signOff: string;
  systemName: string;
}) {
  return `
    <div dir="${opts.dir}" style="direction: ${opts.dir}; text-align: ${opts.align}; padding: 32px 36px;">
      <span style="display: inline-block; background-color: #eff6ff; color: ${ACCENT}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 999px; margin-bottom: 14px;">
        ${opts.badge}
      </span>
      <h2 style="margin: 0 0 18px; font-size: 19px; font-weight: 700; color: ${NAVY};">
        ${opts.title}
      </h2>
      <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: ${TEXT};">${opts.greeting}</p>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${TEXT};">${opts.intro}</p>
      ${opts.table}
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${TEXT};">${opts.outro}</p>
      <p style="margin: 22px 0 0; font-size: 14px; line-height: 1.6; color: ${TEXT};">
        ${opts.signOff}<br><strong>${opts.systemName}</strong>
      </p>
    </div>`;
}

function buildHtml(
  entityType: AssignmentEntityType,
  employeeNameEn: string,
  employeeNameAr: string,
  input: SendAssignmentNotificationInput,
) {
  const tableEn = detailTable(input.detailLines, (l) => l.labelEn, "left");
  const tableAr = detailTable(input.detailLines, (l) => l.labelAr, "right");
  const year = new Date().getFullYear();

  return `
    <div style="font-family: -apple-system, Segoe UI, Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid ${BORDER}; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="background-color: ${NAVY}; padding: 24px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: middle;">
                  <span style="display: inline-block; width: 30px; height: 30px; border-radius: 7px; background-color: ${ACCENT}; color: #ffffff; font-size: 15px; font-weight: 700; text-align: center; line-height: 30px; vertical-align: middle;">M</span>
                  <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 0.2px; vertical-align: middle; margin-inline-start: 10px;">Mandera CRM</span>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <span style="color: #94a3b8; font-size: 12px;">mandera.site</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td>
            ${section({
              dir: "ltr",
              align: "left",
              badge: BADGE_EN[entityType],
              title: TITLES_EN[entityType],
              greeting: `Dear <strong>${employeeNameEn}</strong>,`,
              intro: INTRO_EN[entityType],
              table: tableEn,
              outro: OUTRO_EN,
              signOff: "Best regards,",
              systemName: "Mandera CRM System",
            })}
          </td>
        </tr>

        <tr>
          <td style="padding: 0 36px;"><div style="border-top: 1px solid ${BORDER};"></div></td>
        </tr>

        <tr>
          <td>
            ${section({
              dir: "rtl",
              align: "right",
              badge: BADGE_AR[entityType],
              title: TITLES_AR[entityType],
              greeting: `عزيزي/عزيزتي <strong>${employeeNameAr}</strong>،`,
              intro: INTRO_AR[entityType],
              table: tableAr,
              outro: OUTRO_AR,
              signOff: "مع أطيب التحيات،",
              systemName: "نظام Mandera CRM",
            })}
          </td>
        </tr>

        <tr>
          <td style="background-color: #f8fafc; border-top: 1px solid ${BORDER}; padding: 18px 36px; text-align: center;">
            <span style="font-size: 11px; color: #94a3b8;">
              &copy; ${year} Mandera CRM &middot; This is an automated system notification &middot; هذه رسالة تلقائية من النظام
            </span>
          </td>
        </tr>
      </table>
    </div>
  `;
}

async function resolveEmployeeEmailAndName(employeeId: string) {
  const admin = getSupabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "name, name_en, name_ar, employee:employees!profiles_employee_id_fkey(email, first_name_en, first_name_ar, last_name_en, last_name_ar)",
    )
    .eq("id", employeeId)
    .maybeSingle();

  const employeeRecord = Array.isArray(profile?.employee)
    ? profile?.employee[0]
    : profile?.employee;

  let email = employeeRecord?.email ?? null;
  if (!email) {
    try {
      const { data } = await admin.auth.admin.getUserById(employeeId);
      email = data.user?.email ?? null;
    } catch {
      email = null;
    }
  }
  if (!email) return null;

  const nameEn = employeeDisplayName(employeeRecord, "en", profile?.name_en || profile?.name);
  const nameAr = employeeDisplayName(employeeRecord, "ar", profile?.name_ar || profile?.name);
  return { email, nameEn, nameAr };
}

/** Fire-and-forget: sends a bilingual assignment email to the newly assigned employee. Never throws. */
export async function sendAssignmentNotification(input: SendAssignmentNotificationInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const recipient = await resolveEmployeeEmailAndName(input.employeeId);
    if (!recipient) return;

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: [recipient.email],
      subject: SUBJECTS[input.entityType],
      html: buildHtml(
        input.entityType,
        recipient.nameEn || "Employee",
        recipient.nameAr || recipient.nameEn || "الموظف",
        input,
      ),
    });
  } catch (error) {
    console.error(`Failed to send ${input.entityType} assignment email:`, error);
  }
}
