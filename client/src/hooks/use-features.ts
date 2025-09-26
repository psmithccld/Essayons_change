import { useQuery } from "@tanstack/react-query";

export interface OrganizationFeatures {
  readinessSurveys: boolean;
  gptCoach: boolean;
  communications: boolean;
  changeArtifacts: boolean;
  reports: boolean;
}

export const useFeatures = () => {
  const { data: features, isLoading, error } = useQuery({
    queryKey: ['organization-features'],
    queryFn: async (): Promise<OrganizationFeatures> => {
      const response = await fetch('/api/organization/features');
      if (!response.ok) {
        throw new Error('Failed to fetch organization features');
      }
      return response.json();
    },
    // SECURITY: No initial data - fail closed during loading/error states
  });

  return {
    features: features || {},
    hasFeature: (featureName: keyof OrganizationFeatures) => {
      // SECURITY: Only return true if explicitly enabled and data is loaded
      return !isLoading && features?.[featureName] === true;
    },
    isLoading,
    error
  };
};