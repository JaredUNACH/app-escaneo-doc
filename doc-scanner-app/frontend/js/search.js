document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const rfcSearchInput = document.getElementById('rfc-search');
    const searchButton = document.getElementById('search-button');
    const searchResultsSelect = document.getElementById('search-results');
    const searchResultsContainer = document.getElementById('search-results-container');
    const selectedRfcInfo = document.getElementById('selected-rfc-info');
    const cameraSection = document.getElementById('camera-section');
    const emptyState = document.getElementById('empty-state');
    const appAlert = document.getElementById('app-alert');
    const alertMessage = document.getElementById('alert-message');
    
    // Workflow steps
    const stepSearch = document.getElementById('step-search');
    const stepSelect = document.getElementById('step-select');
    const stepScan = document.getElementById('step-scan');
    const stepProcess = document.getElementById('step-process');
    
    // Mock data for demonstration
    const mockRfcData = [
        { id: 1, rfc: 'ABCD123456XYZ', name: 'Empresa Comercial SA de CV', type: 'Business' },
        { id: 2, rfc: 'XYZW987654ABC', name: 'Juan Pérez Rodríguez', type: 'Individual' },
        { id: 3, rfc: 'EFGH456789LMN', name: 'Consultores Asociados SC', type: 'Business' },
        { id: 4, rfc: 'JKLM654321NOP', name: 'María González López', type: 'Individual' },
    ];
    
    // Show alert message
    function showAlert(message, type = 'info', duration = 3000) {
        alertMessage.textContent = message;
        appAlert.className = 'floating-alert visible';
        
        // Set alert type (info, success, error)
        appAlert.classList.add(`alert-${type}`);
        
        setTimeout(() => {
            appAlert.classList.add('hiding');
            setTimeout(() => {
                appAlert.className = 'floating-alert';
            }, 300);
        }, duration);
    }
    
    // Update workflow steps
    function updateWorkflowStep(step) {
        // Reset all steps
        [stepSearch, stepSelect, stepScan, stepProcess].forEach(el => {
            el.classList.remove('active', 'completed');
        });
        
        switch(step) {
            case 'search':
                stepSearch.classList.add('active');
                break;
            case 'select':
                stepSearch.classList.add('completed');
                stepSelect.classList.add('active');
                break;
            case 'scan':
                stepSearch.classList.add('completed');
                stepSelect.classList.add('completed');
                stepScan.classList.add('active');
                break;
            case 'process':
                stepSearch.classList.add('completed');
                stepSelect.classList.add('completed');
                stepScan.classList.add('completed');
                stepProcess.classList.add('active');
                break;
        }
    }
    
    // Handle search
    function handleSearch() {
        const searchTerm = rfcSearchInput.value.trim().toUpperCase();
        
        if (searchTerm.length < 3) {
            showAlert('Please enter at least 3 characters to search', 'error');
            return;
        }
        
        // Mock API call - replace with actual API call
        const results = mockRfcData.filter(item => 
            item.rfc.includes(searchTerm) || item.name.toUpperCase().includes(searchTerm)
        );
        
        // Clear existing options
        searchResultsSelect.innerHTML = '<option value="" disabled selected>Select a match...</option>';
        
        if (results.length > 0) {
            // Add new options
            results.forEach(result => {
                const option = document.createElement('option');
                option.value = result.id;
                option.textContent = `${result.rfc} - ${result.name}`;
                option.dataset.rfc = result.rfc;
                option.dataset.name = result.name;
                option.dataset.type = result.type;
                searchResultsSelect.appendChild(option);
            });
            
            // Show results
            searchResultsSelect.classList.remove('hidden');
            showAlert(`Found ${results.length} matches`, 'success');
            updateWorkflowStep('select');
        } else {
            showAlert('No matches found. Try a different search term.', 'error');
            searchResultsSelect.classList.add('hidden');
        }
    }
    
    // Handle RFC selection
    function handleRfcSelection() {
        const selectedOption = searchResultsSelect.options[searchResultsSelect.selectedIndex];
        
        if (selectedOption && selectedOption.value) {
            const rfcData = {
                id: selectedOption.value,
                rfc: selectedOption.dataset.rfc,
                name: selectedOption.dataset.name,
                type: selectedOption.dataset.type
            };
            
            // Display selected RFC info
            selectedRfcInfo.innerHTML = `
                <strong>Selected:</strong> ${rfcData.name} (${rfcData.rfc})<br>
                <strong>Type:</strong> ${rfcData.type}
            `;
            
            // Show camera section, hide empty state
            emptyState.classList.add('hidden');
            cameraSection.classList.remove('hidden');
            
            // Update workflow step
            updateWorkflowStep('scan');
            
            showAlert('RFC selected. Please scan document now.', 'success');
        }
    }
    
    // Event listeners
    searchButton.addEventListener('click', handleSearch);
    rfcSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    searchResultsSelect.addEventListener('change', handleRfcSelection);
    
    // Initialize workflow
    updateWorkflowStep('search');
    showAlert('Welcome! Start by searching for an RFC', 'info', 5000);
});