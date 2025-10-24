import { UserModel } from './user.model';
import { ReportModel } from './report.model';
import { TaxModel } from './tax.model';
import { NotificationModel } from './notification.model';
import { ActivityModel } from './activity.model';
import { TaxCollectionModel } from './tax-collection.model';
import { PropertyModel } from './property.model';
import { WardModel } from './ward.model';

export default {
  userModel: UserModel.getInstance(),
  reportModel: ReportModel.getInstance(),
  taxModel: TaxModel.getInstance(),
  notificationModel: NotificationModel.getInstance(),
  activityModel: ActivityModel.getInstance(),
  taxCollectionModel: TaxCollectionModel.getInstance(),
  propertyModel: PropertyModel.getInstance(),
  wardModel: WardModel.getInstance(),
}; 