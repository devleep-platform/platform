import fetch from 'node-fetch';

// Test new lab provision with user 'b0c29dd3-a814-4d45-b3e8-d317a2a9afd4'
const testProvision = async () => {
  try {
    const response = await fetch('https://devops-lab-prod-api.salmondesert-c4dd08a9.eastus.azurecontainerapps.io/api/labs/javascript-basics/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'b0c29dd3-a814-4d45-b3e8-d317a2a9afd4'
      })
    });
    
    const data = await response.json();
    console.log('Provision response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
};

testProvision();
