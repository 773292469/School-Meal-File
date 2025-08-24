// Google Drive integration functionality
        document.addEventListener('DOMContentLoaded', function() {
            // Google Drive API configuration
            // REPLACE THESE WITH YOUR ACTUAL VALUES FROM GOOGLE CLOUD CONSOLE
            const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
            const API_KEY = 'YOUR_GOOGLE_API_KEY';
            const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
            const SCOPES = 'https://www.googleapis.com/auth/drive.file';
            
            let tokenClient;
            let gapiInited = false;
            let gisInited = false;
            
            // DOM elements
            const getLocationBtn = document.getElementById('get-location');
            const confirmLocationBtn = document.getElementById('location-verified');
            const submitReportBtn = document.getElementById('submit-report');
            const saveDriveBtn = document.getElementById('save-drive');
            const syncBtn = document.getElementById('sync-btn');
            const backupBtn = document.getElementById('backup-btn');
            const connectDriveBtn = document.getElementById('connect-drive-btn');
            const setupCompleteBtn = document.getElementById('setup-complete');
            const driveModal = document.getElementById('drive-modal');
            const closeModalBtn = document.querySelector('.close-modal');
            const cancelDriveBtn = document.getElementById('cancel-drive');
            const executeDriveBtn = document.getElementById('execute-drive');
            const mapPlaceholder = document.getElementById('map-placeholder');
            const locationStatus = document.querySelector('.location-status');
            const driveStatus = document.getElementById('drive-status');
            const reportsTableBody = document.getElementById('reports-table-body');
            
            // Initialize Google APIs
            function initializeGapiClient() {
                gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: [DISCOVERY_DOC],
                }).then(function () {
                    gapiInited = true;
                    maybeEnableButtons();
                }, function(error) {
                    console.error('Error initializing GAPI client', error);
                });
            }
            
            gapi.load('client', initializeGapiClient);
            
            // Initialize Google Identity Services
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined later
            });
            
            function gisLoaded() {
                gisInited = true;
                maybeEnableButtons();
            }
            
            function maybeEnableButtons() {
                if (gapiInited && gisInited) {
                    connectDriveBtn.disabled = false;
                }
            }
            
            // Handle Google Drive authentication
            function handleAuthClick() {
                tokenClient.callback = async (resp) => {
                    if (resp.error !== undefined) {
                        throw resp;
                    }
                    
                    // Update UI to show signed-in state
                    driveStatus.innerHTML = '<i class="fas fa-link"></i> Connected to Google Drive';
                    driveStatus.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
                    driveStatus.style.color = 'var(--success)';
                    
                    // Enable Drive actions
                    syncBtn.disabled = false;
                    backupBtn.disabled = false;
                    saveDriveBtn.disabled = false;
                    submitReportBtn.disabled = false;
                    
                    // Load files from Drive
                    listDriveFiles();
                };
                
                if (gapi.client.getToken() === null) {
                    tokenClient.requestAccessToken({prompt: 'consent'});
                } else {
                    tokenClient.requestAccessToken({prompt: ''});
                }
            }
            
            // Handle signout
            function handleSignoutClick() {
                const token = gapi.client.getToken();
                if (token !== null) {
                    google.accounts.oauth2.revoke(token.access_token);
                    gapi.client.setToken('');
                    
                    // Update UI to show signed-out state
                    driveStatus.innerHTML = '<i class="fas fa-unlink"></i> Not connected to Google Drive';
                    driveStatus.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
                    driveStatus.style.color = 'var(--accent)';
                    
                    // Disable Drive actions
                    syncBtn.disabled = true;
                    backupBtn.disabled = true;
                    saveDriveBtn.disabled = true;
                    
                    // Clear reports table
                    reportsTableBody.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 20px;">
                                <i class="fas fa-database" style="font-size: 2rem; color: #ddd; margin-bottom: 10px;"></i>
                                <p>No reports found. Connect to Google Drive to load data.</p>
                            </td>
                        </tr>
                    `;
                }
            }
            
            // List files from Google Drive
            function listDriveFiles() {
                gapi.client.drive.files.list({
                    'pageSize': 10,
                    'fields': "nextPageToken, files(id, name, createdTime, modifiedTime)",
                    'q': "name contains 'meal-inspection' and trashed = false"
                }).then(function(response) {
                    const files = response.result.files;
                    
                    if (files && files.length > 0) {
                        // Update reports table
                        reportsTableBody.innerHTML = '';
                        
                        files.forEach(file => {
                            const row = document.createElement('tr');
                            // Extract school name from file name (assuming format "meal-inspection-[schoolname]-[date]")
                            const schoolName = file.name.replace('meal-inspection-', '').split('-')[0];
                            const reportDate = new Date(file.createdTime).toLocaleDateString();
                            
                            row.innerHTML = `
                                <td>${schoolName}</td>
                                <td>${reportDate}</td>
                                <td>Supervisor Name</td>
                                <td><i class="fas fa-check-circle" style="color: var(--success);"></i></td>
                                <td><i class="fab fa-google-drive" style="color: var(--google-blue);"></i></td>
                                <td>4.2/5</td>
                                <td><span class="status-badge status-completed">Completed</span></td>
                                <td class="action-buttons">
                                    <div class="btn-icon btn-edit" onclick="downloadFile('${file.id}')"><i class="fas fa-download"></i></div>
                                    <div class="btn-icon btn-delete" onclick="deleteFile('${file.id}')"><i class="fas fa-trash"></i></div>
                                </td>
                            `;
                            
                            reportsTableBody.appendChild(row);
                        });
                    } else {
                        reportsTableBody.innerHTML = `
                            <tr>
                                <td colspan="8" style="text-align: center; padding: 20px;">
                                    <i class="fas fa-database" style="font-size: 2rem; color: #ddd; margin-bottom: 10px;"></i>
                                    <p>No inspection reports found in Google Drive.</p>
                                </td>
                            </tr>
                        `;
                    }
                }, function(error) {
                    console.error('Error listing files', error);
                    showNotification('Error loading files from Google Drive', 'error');
                });
            }
            
            // Create a file in Google Drive
            function createDriveFile(fileName, content, folderId = null) {
                const fileMetadata = {
                    'name': fileName,
                    'mimeType': 'application/json',
                    'parents': folderId ? [folderId] : []
                };
                
                const driveFile = gapi.client.drive.files.create({
                    resource: fileMetadata,
                    fields: 'id'
                }).then(function(response) {
                    // File created, now upload content
                    return gapi.client.request({
                        path: '/upload/drive/v3/files/' + response.result.id,
                        method: 'PATCH',
                        params: {
                            uploadType: 'media'
                        },
                        body: JSON.stringify(content)
                    });
                });
                
                return driveFile;
            }
            
            // Modal functionality
            function openModal() {
                driveModal.style.display = 'flex';
            }
            
            function closeModal() {
                driveModal.style.display = 'none';
            }
            
            [syncBtn, backupBtn].forEach(btn => {
                btn.addEventListener('click', openModal);
            });
            
            [closeModalBtn, cancelDriveBtn].forEach(btn => {
                btn.addEventListener('click', closeModal);
            });
            
            executeDriveBtn.addEventListener('click', function() {
                const action = document.getElementById('drive-action').value;
                const folder = document.getElementById('drive-folder').value;
                const backupName = document.getElementById('backup-name').value;
                
                // Simulate Google Drive action
                simulateDriveAction(action, folder, backupName);
                closeModal();
            });
            
            // Location verification functionality
            getLocationBtn.addEventListener('click', function() {
                // Simulate getting location
                mapPlaceholder.innerHTML = `
                    <div style="text-align: center;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
                        <p>Getting your location...</p>
                    </div>
                `;
                
                // In a real application, this would use the Geolocation API
                setTimeout(() => {
                    mapPlaceholder.innerHTML = `
                        <div style="text-align: center;">
                            <i class="fas fa-map-marker-alt" style="font-size: 2rem; color: var(--primary);"></i>
                            <p>Location detected: <strong>7.8731° N, 80.7718° E</strong></p>
                            <p style="font-size: 0.9rem; margin-top: 10px;">Approximate address: Wilgamuwa, Sri Lanka</p>
                        </div>
                    `;
                    
                    locationStatus.className = 'location-status status-verified';
                    locationStatus.innerHTML = '<i class="fas fa-check-circle"></i> Location verified - You appear to be at a school location';
                    
                    confirmLocationBtn.disabled = false;
                }, 2000);
            });
            
            confirmLocationBtn.addEventListener('click', function() {
                // Simulate location confirmation
                confirmLocationBtn.innerHTML = '<i class="fas fa-check-circle"></i> Location Verified';
                confirmLocationBtn.className = 'btn btn-success';
                confirmLocationBtn.disabled = true;
                getLocationBtn.style.display = 'none';
                
                // Enable form submission
                submitReportBtn.disabled = false;
                saveDriveBtn.disabled = false;
                
                // Add verification timestamp
                const verificationTime = new Date().toLocaleString();
                const verificationNote = document.createElement('p');
                verificationNote.style.marginTop = '10px';
                verificationNote.style.fontSize = '0.9rem';
                verificationNote.innerHTML = `<i class="fas fa-clock"></i> Verified at: ${verificationTime}`;
                locationStatus.appendChild(verificationNote);
            });
            
            // Save to Google Drive functionality
            saveDriveBtn.addEventListener('click', function() {
                // Validate form
                const schoolName = document.getElementById('school-name').value;
                if (!schoolName) {
                    alert('Please enter a school name first');
                    return;
                }
                
                // Simulate saving to Google Drive
                saveDriveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                saveDriveBtn.disabled = true;
                
                setTimeout(() => {
                    saveDriveBtn.innerHTML = '<i class="fab fa-google-drive"></i> Saved to Drive';
                    saveDriveBtn.className = 'btn btn-success';
                    
                    // Show notification
                    showNotification('Report successfully saved to Google Drive', 'success');
                    
                    // Reset button after delay
                    setTimeout(() => {
                        saveDriveBtn.innerHTML = '<i class="fab fa-google-drive"></i> Save to Drive';
                        saveDriveBtn.className = 'btn btn-primary';
                        saveDriveBtn.disabled = false;
                    }, 3000);
                }, 2000);
            });
            
            // Form submission
            submitReportBtn.addEventListener('click', function() {
                // Basic validation
                const schoolName = document.getElementById('school-name').value;
                const inspectorName = document.getElementById('inspector-name').value;
                const inspectionDate = document.getElementById('inspection-date').value;
                
                if (!schoolName || !inspectorName || !inspectionDate) {
                    alert('Please fill in all required fields: School Name, Inspector Name, and Inspection Date');
                    return;
                }
                
                // In a real application, this would send data to Google Drive
                submitReportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
                
                setTimeout(() => {
                    alert('Inspection report submitted successfully! Data has been saved to the system and synced with Google Drive.');
                    
                    // Reset form
                    document.querySelectorAll('input, textarea, select').forEach(element => {
                        if (element.type !== 'button') {
                            element.value = '';
                        }
                    });
                    
                    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                        checkbox.checked = false;
                    });
                    
                    // Reset location verification
                    mapPlaceholder.innerHTML = `
                        <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 10px;"></i>
                        <p>Click below to verify your location</p>
                    `;
                    
                    locationStatus.className = 'location-status status-pending';
                    locationStatus.innerHTML = '<i class="fas fa-clock"></i> Location verification pending';
                    
                    confirmLocationBtn.disabled = true;
                    confirmLocationBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Location Verification';
                    confirmLocationBtn.className = 'btn btn-success';
                    
                    getLocationBtn.style.display = 'inline-block';
                    submitReportBtn.innerHTML = '<i class="fas fa-check"></i> Submit Report';
                    submitReportBtn.disabled = true;
                    saveDriveBtn.disabled = true;
                }, 1500);
            });
            
            // Setup complete button
            setupCompleteBtn.addEventListener('click', function() {
                document.querySelector('.setup-steps').style.display = 'none';
                showNotification('Google Drive setup completed. You can now connect to Google Drive.', 'success');
            });
            
            // Connect to Google Drive button
            connectDriveBtn.addEventListener('click', handleAuthClick);
            
            // Simulate Google Drive action
            function simulateDriveAction(action, folder, backupName) {
                let message = '';
                
                switch(action) {
                    case 'backup':
                        message = `Creating backup "${backupName}" in folder "${folder}" on Google Drive...`;
                        break;
                    case 'restore':
                        message = `Restoring from backup "${backupName}" in folder "${folder}"...`;
                        break;
                    case 'sync':
                        message = `Syncing data with folder "${folder}" on Google Drive...`;
                        break;
                }
                
                // Show notification
                showNotification(message, 'info');
                
                // Simulate action completion after delay
                setTimeout(() => {
                    showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} completed successfully!`, 'success');
                }, 3000);
            }
            
            // Show notification function
            function showNotification(message, type) {
                // Create notification element
                const notification = document.createElement('div');
                notification.style.position = 'fixed';
                notification.style.bottom = '20px';
                notification.style.right = '20px';
                notification.style.padding = '15px 20px';
                notification.style.borderRadius = '5px';
                notification.style.color = 'white';
                notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                notification.style.zIndex = '1000';
                notification.style.maxWidth = '350px';
                notification.style.display = 'flex';
                notification.style.alignItems = 'center';
                notification.style.gap = '10px';
                
                // Set background color based on type
                if (type === 'success') {
                    notification.style.backgroundColor = '#2ecc71';
                } else if (type === 'error') {
                    notification.style.backgroundColor = '#e74c3c';
                } else {
                    notification.style.backgroundColor = '#3498db';
                }
                
                // Add icon based on type
                let icon = 'info-circle';
                if (type === 'success') icon = 'check-circle';
                if (type === 'error') icon = 'exclamation-circle';
                
                notification.innerHTML = `
                    <i class="fas fa-${icon}"></i>
                    <span>${message}</span>
                `;
                
                // Add to page
                document.body.appendChild(notification);
                
                // Remove after 5 seconds
                setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        document.body.removeChild(notification);
                    }, 500);
                }, 5000);
            }
            
            // Simulate loading data from backend
            console.log('Loading inspection data from backend...');
            
            // This would be an API call in a real application
            setTimeout(() => {
                console.log('Inspection data loaded successfully');
            }, 1500);
        });