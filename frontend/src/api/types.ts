// Kiểu dữ liệu đối chiếu 1-1 với backend/src/main/java/com/gymflow/dto/Dtos.java
// LocalDate = 'YYYY-MM-DD' · LocalDateTime = 'YYYY-MM-DDTHH:mm:ss' (giờ Việt Nam, không kèm múi giờ) · LocalTime = 'HH:mm:ss'

export type Role = 'ADMIN' | 'TRAINER' | 'MEMBER';
export type UserStatus = 'ACTIVE' | 'LOCKED';
export type MemberStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type SubscriptionState = 'UPCOMING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'CANCELLED';
export type ScheduleStatus = 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
export type PlanStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type MuscleGroup = 'CHEST' | 'BACK' | 'LEGS' | 'SHOULDERS' | 'ARMS' | 'CORE' | 'CARDIO' | 'FULL_BODY';
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface MessageResponse { message: string }
export interface LabelValue { label: string; value: number }

// ---------- Auth ----------
export interface Me {
  id: number; email: string; fullName: string; phone: string | null; role: Role;
  memberId: number | null; trainerId: number | null; lastLoginAt: string | null;
}
export interface LoginResponse { token: string; expiresInMinutes: number; user: Me }
export interface ForgotPasswordResponse { message: string; resetToken: string | null; validMinutes: number }
export interface RegisterRequest {
  fullName: string; email: string; phone: string; password: string; confirmPassword: string; acceptTerms: boolean;
}
export interface RegisterResponse { message: string; email: string }
export interface DemoAccount { label: string; role: Role; email: string; password: string }
export interface AuthOptions { registrationEnabled: boolean; demoAccounts: DemoAccount[] }

// ---------- Member ----------
export interface Member {
  id: number; userId: number; code: string; fullName: string; email: string; phone: string | null;
  dateOfBirth: string | null; gender: Gender | null; heightCm: number | null; goal: string | null; address: string | null;
  status: MemberStatus; accountStatus: UserStatus; trainerId: number | null; trainerName: string | null;
  joinedAt: string; note: string | null;
  currentPlanName: string | null; subscriptionState: SubscriptionState | null;
  subscriptionEndDate: string | null; daysLeft: number | null;
}
export interface MemberForm {
  email?: string; password?: string; fullName: string; phone: string; dateOfBirth: string | null; gender: Gender | null;
  heightCm: number | null; goal: string; address: string; trainerId: number | null; note: string;
}
export interface MemberCreated { member: Member; temporaryPassword: string | null }
export interface MemberDetail {
  member: Member; subscriptions: Subscription[]; plans: WorkoutPlanSummary[];
  latestWeight: Weight | null; totalSessions: number; completedSessions: number;
}

// ---------- Trainer ----------
export interface Shift { id?: number; dayOfWeek: number; startTime: string; endTime: string }
export interface Trainer {
  id: number; userId: number; fullName: string; email: string; phone: string | null; specialty: string | null;
  experienceYears: number; certificates: string | null; bio: string | null; active: boolean;
  accountStatus: UserStatus; memberCount: number; shifts: Shift[];
}
export interface TrainerCreated { trainer: Trainer; temporaryPassword: string | null }

// ---------- Plans & subscriptions ----------
export interface MembershipPlan {
  id: number; name: string; description: string | null; price: number; durationDays: number;
  benefits: string | null; active: boolean; currentSubscriptions: number;
}
export interface Subscription {
  id: number; memberId: number; memberName: string; memberCode: string; planId: number; planName: string;
  startDate: string; endDate: string; pricePaid: number; state: SubscriptionState; daysLeft: number;
  cancelled: boolean; cancelledAt: string | null; note: string | null; createdAt: string; createdByName: string | null;
}
export interface SubscriptionPreview { startDate: string; endDate: string; price: number; chained: boolean }

// ---------- Exercises & plans ----------
export type ReviewStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'NEEDS_REVIEW';
export type ContentOrigin = 'SELF_AUTHORED' | 'ADAPTED';
export type ExerciseLocation = 'GYM' | 'HOME' | 'ANY';
export type ExerciseGoal = 'STRENGTH' | 'ENDURANCE' | 'MOBILITY' | 'BALANCE' | 'FAT_LOSS';
export interface Source {
  id: number; code: string; publisher: string; title: string; url: string; license: string | null; licenseUrl: string | null;
  licenseVerified: boolean; attribution: string | null; publisherReviewed: string | null; accessedAt: string;
}
export interface Exercise {
  id: number; name: string; muscleGroup: MuscleGroup; equipment: string | null; level: Level;
  description: string | null; instructions: string | null; videoUrl: string | null; hidden: boolean;
  usageCount: number; createdByName: string | null;
  nameEn: string | null; aliases: string | null; secondaryMuscles: string | null; location: ExerciseLocation | null;
  goals: ExerciseGoal[]; breathing: string | null; commonMistakes: string | null; safetyNotes: string | null;
  variations: string | null; suggestedDose: string | null; contentOrigin: ContentOrigin;
  reviewStatus: ReviewStatus; reviewNote: string | null; reviewedByName: string | null; reviewedAt: string | null;
  updatedAt: string | null; sources: Source[];
}

// ---------- Knowledge base ----------
export type ArticleCategory = 'NUTRITION' | 'HYDRATION' | 'SLEEP' | 'ACTIVITY' | 'RECOVERY';
export type ArticleStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'ARCHIVED';
export type ArticleAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'ARCHIVE' | 'RESTORE';
export interface ArticleSummary { id: number; slug: string; title: string; category: ArticleCategory; summary: string; publishedAt: string | null }
export interface Article {
  id: number; slug: string; title: string; category: ArticleCategory; summary: string; body: string; contentOrigin: ContentOrigin;
  status: ArticleStatus; reviewNote: string | null; authorName: string | null; authorId: number | null; reviewedByName: string | null;
  reviewedAt: string | null; publishedAt: string | null; createdAt: string | null; updatedAt: string | null; sources: Source[];
}
export interface PlanItem {
  id?: number; exerciseId: number; exerciseName?: string; muscleGroup?: MuscleGroup; equipment?: string | null;
  dayOfWeek: number; sortOrder: number; sets: number; reps: string; weightKg: number | null;
  restSeconds: number | null; durationMinutes: number | null; note: string | null;
}
export interface WorkoutPlanSummary {
  id: number; memberId: number; memberName: string; trainerId: number | null; trainerName: string | null;
  name: string; goal: string | null; startDate: string; endDate: string; status: PlanStatus;
  itemCount: number; trainingDays: number; createdAt: string;
}
export interface WorkoutPlan { summary: WorkoutPlanSummary; note: string | null; items: PlanItem[] }

// ---------- Schedules ----------
export interface WorkoutLog { id: number; completedAt: string; durationMinutes: number | null; calories: number | null; rating: number | null; note: string | null }
export interface Schedule {
  id: number; memberId: number; memberName: string; trainerId: number | null; trainerName: string | null;
  planId: number | null; planName: string | null; title: string; startTime: string; endTime: string;
  status: ScheduleStatus; note: string | null; log: WorkoutLog | null;
}
export interface ScheduleCreated { created: Schedule[]; skipped: string[] }

// ---------- Progress ----------
export interface Weight { id: number; recordedDate: string; weightKg: number; bodyFat: number | null; note: string | null }
export interface WeekAttendance { weekStart: string; scheduled: number; completed: number; missed: number }
export interface Progress {
  memberId: number; heightCm: number | null; currentWeight: number | null; startWeight: number | null;
  weightChange: number | null; bodyFat: number | null; bmi: number | null; bmiCategory: string | null;
  weights: Weight[]; attendance: WeekAttendance[]; attendanceRate: number | null; streakWeeks: number;
  totalSessions: number; totalMinutes: number; totalCalories: number; avgRating: number | null;
}

// ---------- Dashboards ----------
export interface AdminDashboard {
  totalMembers: number; activeMembers: number; newMembersThisMonth: number; membersWithActivePackage: number;
  expiringSoon: number; revenueThisMonth: number; revenuePrevMonth: number; activeTrainers: number; sessionsToday: number;
  revenueByMonth: LabelValue[]; planDistribution: LabelValue[]; expiring: Subscription[]; recentActivity: AuditEntry[];
}
export interface TrainerDashboard {
  memberCount: number; sessionsToday: number; sessionsThisWeek: number; completedThisWeek: number; missedThisWeek: number;
  completionRate: number | null; activePlans: number; todaySessions: Schedule[]; expiringMembers: Subscription[]; weekLoad: LabelValue[];
}
export interface MemberDashboard {
  member: Member; currentSubscription: Subscription | null; nextSession: Schedule | null; weekSessions: Schedule[];
  completedThisMonth: number; streakWeeks: number; latestWeight: Weight | null; bmi: number | null; bmiCategory: string | null;
  currentPlan: WorkoutPlanSummary | null;
}

// ---------- Reports ----------
export interface TrainerAttendance { trainerId: number; trainerName: string; total: number; completed: number; missed: number }
export interface Report {
  from: string; to: string; revenueTotal: number; subscriptionCount: number;
  revenueByMonth: LabelValue[]; revenueByPlan: LabelValue[];
  scheduled: number; completed: number; missed: number; cancelled: number; attendanceRate: number | null;
  byTrainer: TrainerAttendance[]; membersByStatus: LabelValue[]; membersByGender: LabelValue[]; newMembersByMonth: LabelValue[];
}

// ---------- Users, audit, notifications ----------
export interface UserAccount { id: number; email: string; fullName: string; phone: string | null; role: Role; status: UserStatus; lastLoginAt: string | null; createdAt: string }
export interface AuditEntry { id: number; actorId: number | null; actorEmail: string | null; action: string; targetType: string | null; targetId: string | null; detail: string | null; success: boolean; ip: string | null; createdAt: string }
export interface Notification { id: string; level: 'info' | 'warning' | 'danger'; title: string; message: string; link: string | null; at: string }

export interface ApiErrorBody { status: number; message: string; fieldErrors?: Record<string, string> | null }

export interface UserCreated { user: UserAccount; temporaryPassword: string | null }
