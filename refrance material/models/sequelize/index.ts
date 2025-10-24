import Tenant from './Tenant';
import User from './User';
import Role from './Role';
import UserRole from './UserRole';
import TaxType from './TaxType';
import TaxRate from './TaxRate';
import TaxContract from './TaxContract';
import TaxCalculationType from './TaxCalculationType';
import Ward from './Ward';
import PropertyAddress from './PropertyAddress';
import PropertyType from './PropertyType';
import AuditLog from './AuditLog';
import Property from './Property';
import TaxAssessment from './TaxAssessment';
import TaxPayment from './TaxPayment';
import ActivityType from './ActivityType';
import ActivityTemplate from './ActivityTemplate';
import Activity from './Activity';
import ActivityParticipant from './ActivityParticipant';
import ActivityReport from './ActivityReport';
import MiscellaneousPayment from './MiscellaneousPayment';
import Meeting from './Meeting';
import MeetingAttendee from './MeetingAttendee';
import MeetingResolution from './MeetingResolution';
import MeetingTemplate from './MeetingTemplate';
import MeetingTopic from './MeetingTopic';
import TaxReceipt from './TaxReceipt';

// Initialize all associations (these are already defined in individual model files)

// Export all models
export {
  Tenant,
  User,
  Role,
  UserRole,
  TaxType,
  TaxRate,
  TaxContract,
  TaxCalculationType,
  Ward,
  PropertyAddress,
  PropertyType,
  Property,
  TaxAssessment,
  TaxPayment,
  ActivityType,
  ActivityTemplate,
  Activity,
  ActivityParticipant,
  ActivityReport,
  MiscellaneousPayment,
  Meeting,
  MeetingAttendee,
  MeetingResolution,
  MeetingTemplate,
  MeetingTopic,
  TaxReceipt,
  AuditLog
}; 