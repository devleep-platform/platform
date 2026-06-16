-- 013_rename_docker_ec2_module.sql
-- docker-ec2 module was consolidated into linux-ec2 (Docker CE is pre-installed on the golden AMI).
-- Update all existing lab_definitions rows so the worker finds the correct Terraform module.
UPDATE lab_definitions
  SET terraform_module = 'labs/linux-ec2',
      updated_at       = NOW()
  WHERE terraform_module = 'labs/docker-ec2';
