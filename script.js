// Global State array to hold our selected image files and their preview data
let uploadedImages = [];

// --- UI Elements ---
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const chooseBtn = document.getElementById('choose-btn');
const outputContainer = document.getElementById('output-container');
const actionBar = document.getElementById('action-bar');
const statusText = document.getElementById('status-text');
const convertBtn = document.getElementById('convert-btn');
const modal = document.getElementById('processing-modal');

// --- Helper: Download Function ---
function download(data, filename, type) {
    const blob = new Blob([data], { type: type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// --- Event Listeners for Uploading ---
chooseBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    fileInput.click();
});

uploadArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
    fileInput.value = ''; 
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

// --- Handle Adding Files ---
function handleFiles(files) {
    // Filter only JPG and PNG images
    const newFiles = Array.from(files).filter(file => 
        file.type === 'image/jpeg' || 
        file.type === 'image/jpg' || 
        file.type === 'image/png'
    );
    
    if (newFiles.length === 0) {
        alert("Please select valid image files (JPG or PNG).");
        return;
    }

    modal.style.display = 'flex';

    let filesProcessed = 0;

    // Use FileReader to create object URLs for the previews
    newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImages.push({
                file: file,
                previewUrl: e.target.result,
                isJpg: file.type === 'image/jpeg' || file.type === 'image/jpg'
            });

            filesProcessed++;
            
            // Once all newly added files are processed, render the UI
            if (filesProcessed === newFiles.length) {
                renderUI();
                modal.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    });
}

// --- Handle Removing Files ---
window.removeImage = function(index) {
    uploadedImages.splice(index, 1);
    renderUI();
}

// --- Render the UI ---
function renderUI() {
    outputContainer.innerHTML = '';

    if (uploadedImages.length > 0) {
        actionBar.style.display = 'block';
        statusText.innerText = `${uploadedImages.length} image(s) ready to convert.`;
    } else {
        actionBar.style.display = 'none';
    }

    uploadedImages.forEach((imgObj, index) => {
        const card = document.createElement('div');
        card.className = 'image-card';

        // Display the actual image using the generated Data URL
        card.innerHTML = `
            <img src="${imgObj.previewUrl}" class="image-preview" alt="Preview">
            <div class="image-name">${imgObj.file.name}</div>
            <button class="remove-btn" onclick="removeImage(${index})">❌ Remove</button>
        `;
        
        outputContainer.appendChild(card);
    });
}

// --- Convert to PDF Logic ---
convertBtn.addEventListener('click', async () => {
    if (uploadedImages.length === 0) return;

    modal.style.display = 'flex';

    try {
        const { PDFDocument } = PDFLib;
        const newPdfDoc = await PDFDocument.create();

        // Loop through all images and add them as pages
        for (const imgObj of uploadedImages) {
            // Fetch fresh bytes from the File object
            const imageBytes = await imgObj.file.arrayBuffer();
            let embeddedImage;

            // Embed based on file type
            if (imgObj.isJpg) {
                embeddedImage = await newPdfDoc.embedJpg(imageBytes);
            } else {
                embeddedImage = await newPdfDoc.embedPng(imageBytes);
            }

            // Get original image dimensions to create a perfectly sized PDF page
            const imgDims = embeddedImage.scale(1);
            
            // Create a new page matching the image dimensions
            const page = newPdfDoc.addPage([imgDims.width, imgDims.height]);

            // Draw the image filling the entire page
            page.drawImage(embeddedImage, {
                x: 0,
                y: 0,
                width: imgDims.width,
                height: imgDims.height,
            });
        }

        // Save and trigger download
        const pdfBytes = await newPdfDoc.save();
        download(pdfBytes, "Converted_Images.pdf", "application/pdf");
        
    } catch (error) {
        console.error("Error converting images:", error);
        alert("An error occurred during conversion.");
    }
    
    modal.style.display = 'none';
});
