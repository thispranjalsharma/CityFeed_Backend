import { Container } from "inversify";
import {
  IUserRepository,
  UserRepository,
} from "./repositories/user.repository";
import { IUserService, UserService } from "./services/user.service";
import { UserController } from "./controllers/user.controller";
import {
  AdminRepository,
  IAdminRepository,
} from "./repositories/admin.repository";
import { AdminService, IAdminService } from "./services/admin.service";
import { AdminController } from "./controllers/admin.controller";
import {
  DineInSessionRepository,
  IDineInSessionRepository,
} from "./repositories/dineInSession.repository";
import { DineInService, IDineInService } from "./services/dineIn.service";
import { DineInController } from "./controllers/dineIn.controller";
import {
  EventRepository,
  IEventRepository,
} from "./repositories/event.repository";
import { EventController } from "./controllers/event.controller";
import {
  IRewardHistoryRepository,
  RewardHistoryRepository,
} from "./repositories/rewardHistory.repository";
import {
  IReviewRepository,
  ReviewRepository,
} from "./repositories/review.repository";
import {
  IPaymentRepository,
  PaymentRepository,
} from "./repositories/payment.repository";
import {
  IOutletAdminRepository,
  OutletAdminRepository,
} from "./repositories/outletAdmin.repository";
import {
  IOutletRepository,
  OutletRepository,
} from "./repositories/outlet.repository";
import {
  IOfferRepository,
  OfferRepository,
} from "./repositories/offer.repository";
import {
  FeedbackRepository,
  IFeedbackRepository,
} from "./repositories/feedback.repository";
import {
  EventOrganizerRepository,
  IEventOrganizerRepository,
} from "./repositories/eventOrganizer.repository";
import { AuthService, IAuthService } from "./services/auth.service";
import {
  EmailQueueService,
  IEmailQueueService,
} from "./services/emailQueue.service";
import {
  EventAuthService,
  IEventAuthService,
} from "./services/eventAuth.service";
import { IOfferService, OfferService } from "./services/offer.service";
import { IOtpService, OTPService } from "./services/otp.service";
import { IOutletService, OutletService } from "./services/outlet.service";
import { IPaymentService, PaymentService } from "./services/payment.service";
import { IReviewService, ReviewService } from "./services/review.service";
import { IRewardService, RewardService } from "./services/reward.service";
import { ISendGridService, SendGridService } from "./services/sendgrid.service";
import { IStaffService, StaffService } from "./services/staff.service";
import {
  ISuperAdminService,
  SuperAdminService,
} from "./services/superAdmin.service";
import { OfferController } from "./controllers/offer.controller";
import { AuthController } from "./controllers/auth.controller";
import { EventAuthController } from "./controllers/eventAuth.controller";
import { EventManagerController } from "./controllers/eventManager.controller";
import { EventStaffController } from "./controllers/eventStaff.controller";
import { FeedbackController } from "./controllers/feedback.controller";
import { PaymentController } from "./controllers/payment.controller";
import { ReviewController } from "./controllers/review.controller";
import { StaffController } from "./controllers/staff.controller";
import { OrderController } from "./controllers/order.controller";
import { OutletController } from "./controllers/outlet.controller";
import { OutletAdminController } from "./controllers/outletAdmin.controller";
import { SuperAdminController } from "./controllers/superAdmin.controller";
import { TicketController } from "./controllers/ticket.controller";
import { TicketTierController } from "./controllers/ticketTier.controller";
import { User } from "./models/user.model";
import { Payment } from "./models/payment.model";
import { RewardHistory } from "./models/rewardHistory.model";
import { Outlet } from "./models/outlet.model";
import { Review } from "./models/review.model";
import { DineInSession } from "./models/dineInSession.model";
import { Offer } from "./models/offer.model";
import { OutletAdmin } from "./models/outletAdmin.model";
import {
  IOutletAdminService,
  OutletAdminService,
} from "./services/outletAdmin.service";
import { TokenService } from "./services/token.service";
import { CronScheduler } from "./utils/cronScheduler.util";
import { EventOrganizer } from "./models/eventOrganizer.model";
import { Admin } from "./models/admin.model";

const container = new Container({
  defaultScope: "Singleton",
});

// Models
container.bind<typeof Admin>("Admin").toConstantValue(Admin);

container.bind<typeof User>("UserModel").toConstantValue(User);
container.bind<typeof Payment>("PaymentModel").toConstantValue(Payment);
container
  .bind<typeof RewardHistory>("RewardHistory")
  .toConstantValue(RewardHistory);

container.bind<typeof Outlet>("OutletModel").toConstantValue(Outlet);
container.bind<typeof Event>("Event").toConstantValue(Event);
container.bind<typeof Review>("Review").toConstantValue(Review);
container
  .bind<typeof DineInSession>("DineInSession")
  .toConstantValue(DineInSession);
container.bind<typeof Offer>("Offer").toConstantValue(Offer);
container.bind<typeof OutletAdmin>("OutletAdmin").toConstantValue(OutletAdmin);
container
  .bind<typeof EventOrganizer>("EventOrganizer")
  .toConstantValue(EventOrganizer);


// Repositories
container.bind<IUserRepository>("UserRepository").to(UserRepository);
container
  .bind<IRewardHistoryRepository>("RewardHistoryRepository")
  .to(RewardHistoryRepository);
container.bind<IReviewRepository>("ReviewRepository").to(ReviewRepository);
container.bind<IPaymentRepository>("PaymentRepository").to(PaymentRepository);
container
  .bind<IOutletAdminRepository>("OutletAdminRepository")
  .to(OutletAdminRepository);
container.bind<IOutletRepository>("OutletRepository").to(OutletRepository);
container.bind<IOfferRepository>("OfferRepository").to(OfferRepository);
container
  .bind<IFeedbackRepository>("FeedbackRepository")
  .to(FeedbackRepository);
container
  .bind<IEventOrganizerRepository>("EventOrganizerRepository")
  .to(EventOrganizerRepository);
container.bind<IEventRepository>("EventRepository").to(EventRepository);

container
  .bind<IDineInSessionRepository>("DineInSessionRepository")
  .to(DineInSessionRepository);
container.bind<IAdminRepository>("AdminRepository").to(AdminRepository);

// Services

container.bind<IAdminService>("AdminService").to(AdminService);
container.bind<IAuthService>("AuthService").to(AuthService);
container.bind<IDineInService>("DineInService").to(DineInService);
container.bind<IEmailQueueService>("EmailQueueService").to(EmailQueueService);
container.bind<IEventAuthService>("EventAuthService").to(EventAuthService);
container.bind<IOfferService>("OfferService").to(OfferService);
container.bind<IOtpService>("OTPService").to(OTPService);
container.bind<IOutletService>("OutletService").to(OutletService);
container.bind<IPaymentService>("PaymentService").to(PaymentService);
// container.bind<IRateli
container.bind<IReviewService>("ReviewService").to(ReviewService);
container.bind<IRewardService>("RewardService").to(RewardService);
container.bind<ISendGridService>("SendGridService").to(SendGridService);
container.bind<IStaffService>("StaffService").to(StaffService);
container.bind<ISuperAdminService>("SuperAdminService").to(SuperAdminService);

container.bind<IUserService>("UserService").to(UserService);
container
  .bind<IOutletAdminService>("OutletAdminService")
  .to(OutletAdminService);

container.bind<TokenService>("TokenService").to(TokenService);

// Controllers
container.bind<AdminController>(AdminController).toSelf();
container.bind<AuthController>(AuthController).toSelf();
container.bind<DineInController>(DineInController).toSelf();
container.bind<EventController>(EventController).toSelf();
container.bind<EventAuthController>(EventAuthController).toSelf();
container.bind<EventManagerController>(EventManagerController).toSelf();
container.bind<EventStaffController>(EventStaffController).toSelf();
container.bind<FeedbackController>(FeedbackController).toSelf();
container.bind<OfferController>(OfferController).toSelf();
container.bind<OrderController>(OrderController).toSelf();
container.bind<OutletController>(OutletController).toSelf();
container.bind<OutletAdminController>(OutletAdminController).toSelf();
container.bind<PaymentController>(PaymentController).toSelf();
container.bind<ReviewController>(ReviewController).toSelf();
container.bind<StaffController>(StaffController).toSelf();
container.bind<SuperAdminController>(SuperAdminController).toSelf();
container.bind<TicketController>(TicketController).toSelf();
container.bind<TicketTierController>(TicketTierController).toSelf();
container.bind<UserController>(UserController).toSelf();
container.bind<CronScheduler>("CronScheduler").to(CronScheduler);

export default container;
