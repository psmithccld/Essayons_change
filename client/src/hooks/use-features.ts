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
    // Default to all features enabled during loading/error states
    initialData: {
      readinessSurveys: true,
      gptCoach: true,
      communications: true,
      changeArtifacts: true,
      reports: true
    } as OrganizationFeatures
  });

  return {
    features: features || {},
    hasFeature: (featureName: keyof OrganizationFeatures) => {
      return features?.[featureName] || false;
    },
    isLoading,
    error
  };
};