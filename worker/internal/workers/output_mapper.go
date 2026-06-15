package workers

import (
	"fmt"
	"regexp"
	"strings"
)

// OutputMapperConfig contains lab definition data needed for template substitution
type OutputMapperConfig struct {
	OutputsMapping map[string]string              // Maps template variable to output name (e.g., EC2_IP -> ec2_private_ip)
	TerraformOutputs map[string]interface{}       // Actual OpenTofu outputs (e.g., ec2_private_ip -> "10.0.1.42")
}

// SubstituteTemplateVariables replaces {{VAR}} placeholders with actual values
// Example: {{EC2_IP}} → "10.0.1.42" using outputs_mapping
func SubstituteTemplateVariables(text string, config OutputMapperConfig) (string, error) {
	result := text
	
	// Find all {{VARIABLE}} patterns
	pattern := regexp.MustCompile(`\{\{([A-Z_]+)\}\}`)
	matches := pattern.FindAllStringSubmatch(result, -1)
	
	for _, match := range matches {
		templateVar := match[1]  // e.g., "EC2_IP"
		placeholder := match[0]  // e.g., "{{EC2_IP}}"
		
		// Look up template var in outputs_mapping
		outputName, exists := config.OutputsMapping[templateVar]
		if !exists {
			return "", fmt.Errorf("template variable {{%s}} not found in outputs_mapping", templateVar)
		}
		
		// Get actual value from terraform outputs
		outputValue, exists := config.TerraformOutputs[outputName]
		if !exists {
			return "", fmt.Errorf("terraform output '%s' (mapped from {{%s}}) not found in outputs", outputName, templateVar)
		}
		
		// Convert output value to string
		var valueStr string
		switch v := outputValue.(type) {
		case string:
			valueStr = v
		case float64:
			valueStr = fmt.Sprintf("%.0f", v)
		case int:
			valueStr = fmt.Sprintf("%d", v)
		default:
			valueStr = fmt.Sprintf("%v", v)
		}
		
		// Replace placeholder with actual value
		result = strings.ReplaceAll(result, placeholder, valueStr)
	}
	
	return result, nil
}

// ValidateTemplateVariables checks that all template variables can be resolved
func ValidateTemplateVariables(text string, config OutputMapperConfig) error {
	pattern := regexp.MustCompile(`\{\{([A-Z_]+)\}\}`)
	matches := pattern.FindAllStringSubmatch(text, -1)
	
	for _, match := range matches {
		templateVar := match[1]
		
		// Check outputs_mapping
		outputName, exists := config.OutputsMapping[templateVar]
		if !exists {
			return fmt.Errorf("template variable {{%s}} not found in outputs_mapping", templateVar)
		}
		
		// Check terraform outputs
		if _, exists := config.TerraformOutputs[outputName]; !exists {
			return fmt.Errorf("terraform output '%s' (mapped from {{%s}}) not found in outputs", outputName, templateVar)
		}
	}
	
	return nil
}

// ExtractTemplateVariables returns all template variables used in text
func ExtractTemplateVariables(text string) []string {
	pattern := regexp.MustCompile(`\{\{([A-Z_]+)\}\}`)
	matches := pattern.FindAllStringSubmatch(text, -1)
	
	vars := []string{}
	seen := make(map[string]bool)
	
	for _, match := range matches {
		templateVar := match[1]
		if !seen[templateVar] {
			vars = append(vars, templateVar)
			seen[templateVar] = true
		}
	}
	
	return vars
}
