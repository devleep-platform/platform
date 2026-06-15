/** Display metadata for terraform_module values used in lab grouping. */

export interface TerraformModuleInfo {
  id: string;
  label: string;
  description: string;
}

export const TERRAFORM_MODULES: Record<string, TerraformModuleInfo> = {
  "labs/linux-ec2": {
    id: "labs/linux-ec2",
    label: "Linux Environment",
    description:
      "Ubuntu EC2 in an isolated VPC. Multiple Linux labs share one environment for the day (~25s switch between labs).",
  },
  "labs/docker-ec2": {
    id: "labs/docker-ec2",
    label: "Docker Environment",
    description: "EC2 with Docker for container deployment and CI/CD style labs.",
  },
  "labs/kubernetes-eks": {
    id: "labs/kubernetes-eks",
    label: "Kubernetes Environment",
    description: "EKS cluster labs (longer provisioning — use when ready for v2).",
  },
};

export function getModuleInfo(moduleId: string): TerraformModuleInfo {
  return (
    TERRAFORM_MODULES[moduleId] ?? {
      id: moduleId,
      label: moduleId.replace("labs/", "").replace(/-/g, " "),
      description: "Hands-on infrastructure lab track.",
    }
  );
}

export function groupLabsByModule<T extends { terraform_module: string }>(
  labs: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const lab of labs) {
    const list = map.get(lab.terraform_module) ?? [];
    list.push(lab);
    map.set(lab.terraform_module, list);
  }
  return map;
}
