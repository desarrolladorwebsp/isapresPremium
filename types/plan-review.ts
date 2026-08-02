export interface PublicPlanReview {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  executiveRating: number;
  comment: string;
  planCode: string;
  planName: string;
  isapreName: string;
  createdAt: string;
}
