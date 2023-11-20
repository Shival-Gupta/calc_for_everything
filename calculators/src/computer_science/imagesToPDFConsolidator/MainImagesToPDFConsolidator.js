import React, { useState, useCallback, useEffect } from 'react';
import { Container, Typography, Button, Grid, TextField, Select, MenuItem, FormControlLabel, Switch, Box, Card, CardContent, CardMedia } from '@mui/material'; // Import CardContent
import CancelIcon from '@mui/icons-material/Cancel';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import PropTypes from 'prop-types';

const defaultPdfFilename = 'CalcForEverything_ImagesToPdf'; // Default PDF filename
const MAX_IMAGE_COUNT_WARNING = 25; // set your desired maximum image count

// CustomImage extends the built-in Image class and includes a mimeType property
class CustomImage extends Image {
    constructor(mimeType) {
        super();
        this.mimeType = mimeType;
    }

    // Get the image type (e.g., jpeg or png) from the stored mimeType
    get imageType() {
        return this.mimeType.split('/')[1];
    }
}

// Function to convert a File object to an image URL
const fileToImageURL = (file) => {
    return new Promise((resolve, reject) => {
        const image = new CustomImage(file.type);
        image.name = file.name;

        image.onload = () => {
            resolve(image);
        };

        image.onerror = () => {
            reject(new Error('Failed to convert File to Image'));
        };

        image.src = URL.createObjectURL(file);
    });
};

// Definition of common page sizes for PDF generation
const pageSizes = {
    A0: { width: 841, height: 1189 },
    A1: { width: 594, height: 841 },
    A2: { width: 420, height: 594 },
    A3: { width: 297, height: 420 },
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    Legal: { width: 216, height: 356 },
    Letter: { width: 216, height: 279 },
    Tabloid: { width: 279, height: 432 }
    // Add more page sizes as needed
};

// Image alignment options for PDF placement
const imageAlignments = {
    'Top-Left': { horizontal: 'left', vertical: 'top' },
    'Top-Middle': { horizontal: 'center', vertical: 'top' },
    'Top-Right': { horizontal: 'right', vertical: 'top' },
    'Mid-Left': { horizontal: 'left', vertical: 'middle' },
    'Mid-Middle': { horizontal: 'center', vertical: 'middle' },
    'Mid-Right': { horizontal: 'right', vertical: 'middle' },
    'Bottom-Left': { horizontal: 'left', vertical: 'bottom' },
    'Bottom-Middle': { horizontal: 'center', vertical: 'bottom' },
    'Bottom-Right': { horizontal: 'right', vertical: 'bottom' }
};

// Function to generate a PDF from images
const generatePdfFromImages = (images, pdfFilename, pageSize, fitToPage, alignment, appendDateTime, pageOrientation, marginSetting) => {
    const doc = new jsPDF({
        unit: 'mm',
        orientation: pageOrientation, // Set page orientation
        marginLeft: marginSetting === 'Minimum' ? 10 : 20,
        marginRight: marginSetting === 'Minimum' ? 10 : 20,
        marginTop: marginSetting === 'Minimum' ? 10 : 20,
        marginBottom: marginSetting === 'Minimum' ? 10 : 20,
    });

    // Delete the initial blank page
    doc.deletePage(1);

    images.forEach((image) => {
        const imageWidth = image.width;
        const imageHeight = image.height;

        let pageWidth = pageSizes[pageSize].width;
        let pageHeight = pageSizes[pageSize].height;

        if (pageSize === 'Auto') {
            // Set the page size based on the image size
            pageWidth = imageWidth;
            pageHeight = imageHeight;
        }

        let scaleFactor = 1;
        let xPosition = 0;
        let yPosition = 0;

        if (fitToPage) {
            scaleFactor = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
            const scaledWidth = imageWidth * scaleFactor;
            const scaledHeight = imageHeight * scaleFactor;
            xPosition = (pageWidth - scaledWidth) / 2;
            yPosition = (pageHeight - scaledHeight) / 2;
        }

        const alignmentInfo = imageAlignments[alignment];
        if (alignmentInfo) {
            const { horizontal, vertical } = alignmentInfo;
            xPosition = horizontal === 'center' ? (pageWidth - imageWidth * scaleFactor) / 2 : (horizontal === 'right' ? pageWidth - imageWidth * scaleFactor : 0);
            yPosition = vertical === 'middle' ? (pageHeight - imageHeight * scaleFactor) / 2 : (vertical === 'bottom' ? pageHeight - imageHeight * scaleFactor : 0);
        }

        doc.addPage([pageWidth, pageHeight]); // Set page size here

        doc.addImage(image.src, image.imageType, xPosition, yPosition, imageWidth * scaleFactor, imageHeight * scaleFactor);
    });

    if (pdfFilename === '') pdfFilename = defaultPdfFilename;

    if (appendDateTime) {
        const timestamp = format(new Date(), 'ddMMyyyy_HHmmss');
        pdfFilename = `${pdfFilename}_${timestamp}.pdf`;
    }

    doc.save(pdfFilename);
};

function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    {children}
                </Box>
            )}
        </div>
    );
}

CustomTabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
};

// Main functional component for the Images to PDF Consolidator
function MainImagesToPDFConsolidator() {
    // State management using React hooks
    const [uploadedImages, setUploadedImages] = useState([]);
    const [pdfFilename, setPdfFilename] = useState('');
    const [warningMessage, setWarningMessage] = useState('');
    const [pageOrientation, setPageOrientation] = useState('Portrait');
    const [pageSize, setPageSize] = useState('A4');
    const [marginSetting, setMarginSetting] = useState('Default');
    const [fitToPage, setFitToPage] = useState(true);
    const [appendDateTime, setAppendDateTime] = useState(true);
    const [alignment, setAlignment] = useState('Top-Left');
    const [isDragging, setIsDragging] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    const autoSwitchTabs = useCallback(() => {
        if (uploadedImages.length > 0) {
            setActiveTab(1); // Automatically switch to the "Export PDF" tab
        } else {
            setActiveTab(0); // Stay on the "Upload Image" tab
        }
    }, [uploadedImages]);

    useEffect(() => {
        autoSwitchTabs();
    }, [uploadedImages, autoSwitchTabs]);

    // Callback function for handling image uploads
    const handleImageUpload = useCallback((event) => {
        const fileList = event.target.files;
        const fileArray = fileList ? Array.from(fileList) : [];

        const currentImageCount = uploadedImages.length + fileArray.length;

        // Check if the total image count exceeds the warning threshold
        if (currentImageCount > MAX_IMAGE_COUNT_WARNING) {
            setWarningMessage('Warning: Uploading too many images may result in a large PDF file.');
        } else {
            setWarningMessage('');  // Clear any previous warning message
        }

        const fileToImagePromises = fileArray.map((file) => {
            const image = new CustomImage(file.type);
            image.name = file.name; // Set the image name to the file name
            return fileToImageURL(file);
        });
        Promise.all(fileToImagePromises)
            .then((images) => {
                setUploadedImages((prevImages) => [...prevImages, ...images]);
                setWarningMessage('');  // Clear the warning message once the images are loaded
            })
            .catch((error) => {
                setWarningMessage('Error loading images.');
                console.error(error);
            });
    }, [uploadedImages]);

    // Event handler for dropping images onto the container
    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false); // Reset the dragging state
        const fileList = event.dataTransfer.files;
        handleImageUpload({ target: { files: fileList } });
    };

    // Cleanup function for uploaded images
    const cleanUpUploadedImages = useCallback(() => {
        setUploadedImages([]);
        uploadedImages.forEach((image) => {
            URL.revokeObjectURL(image.src);
        });
    }, [setUploadedImages, uploadedImages]);

    // Function to generate a PDF from uploaded images
    const handleGeneratePdfFromImages = useCallback(() => {
        try {
            generatePdfFromImages(uploadedImages, pdfFilename, pageSize, fitToPage, alignment, appendDateTime);
            cleanUpUploadedImages();
            setWarningMessage('');
        } catch (error) {
            setWarningMessage('Error generating the PDF.');
            console.error(error);
        }
    }, [uploadedImages, cleanUpUploadedImages, pdfFilename, pageSize, fitToPage, alignment, appendDateTime]);

    // Function to remove an image by its index
    const removeImage = (index) => {
        const updatedImages = [...uploadedImages];
        updatedImages.splice(index, 1);
        setUploadedImages(updatedImages);
    };

    // Function to dismiss the warning message
    const dismissWarningMessage = () => {
        setWarningMessage('');
    };

    // Main rendering of the component
    return (
        <Container maxWidth="lg" sx={{ bgcolor: '#eeeeee', minHeight: '90vh', paddingY: 10 }}>
            <Typography pt={1} variant='h5' sx={{ textAlign: "center" }}>Images To PDF Consolidator</Typography>
            <hr />
            <br />

            {/* Warning Text */}
            {warningMessage && ( // Only display the warning if there is a message
                <Grid item xs={12} sx={{ textAlign: 'center', color: 'red' }}>
                    <Typography variant="subtitle2">{warningMessage}</Typography>
                    <Button
                        onClick={dismissWarningMessage}
                        variant="outlined"
                        size="small"
                        color="primary"
                    >
                        Dismiss
                    </Button>
                </Grid>
            )}

            <Box>
                {/* Upload Image(s) Tab */}
                <CustomTabPanel value={activeTab} index={0}>
                    <Grid container spacing={2} justifyContent="center" alignItems="center">
                        {/* 'Drag and Drop' Container */}
                        <Grid item xs={12} md={8}>
                            <Container
                                onDrop={handleDrop}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                sx={{
                                    minHeight: '200px',
                                    border: isDragging ? '2px dashed #333333' : '2px dashed #cccccc',
                                    borderRadius: '5px',
                                }}
                            >
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        minHeight: '200px',
                                        minWidth: '50px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    Drop image(s) here
                                </Typography>
                            </Container>
                        </Grid>

                        {/* 'or' Text */}
                        <Grid item xs={12} md={1} sx={{ textAlign: 'center' }}>
                            <Typography variant="subtitle2">or</Typography>
                        </Grid>

                        {/* Select Images Button */}
                        <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
                            <div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    style={{ display: 'none' }}
                                    id="image-upload"
                                    onChange={handleImageUpload}
                                />
                                <label htmlFor="image-upload">
                                    <Button
                                        variant="outlined"
                                        component="span"
                                        size="large"
                                        color="primary"
                                        fullWidth
                                        sx={{ minHeight: '200px' }}
                                    >
                                        Select Image(s)
                                    </Button>
                                </label>
                            </div>
                        </Grid>

                        {/* 'n pages selected' Text */}
                        <Grid item xs={12} sx={{ textAlign: 'center' }}>
                            {uploadedImages.length > 0 && (
                                <Typography variant="subtitle2" color="textSecondary">
                                    {uploadedImages.length} image(s) selected.
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </CustomTabPanel>

                {/* Export PDF Tab */}
                <CustomTabPanel value={activeTab} index={1}>
                    <Grid container spacing={2} justifyContent="space-between">
                        {/* Image Preview Section */}
                        <Grid item xs={12} md={9} container spacing={2} justifyContent="center" alignItems="baseline">
                            {/* For each image */}
                            {uploadedImages.map((image, index) => {
                                return (
                                    <Grid item xs={2} key={index}>
                                        {/* Card for each image */}
                                        <Card sx={{ maxWidth: 300 }}>
                                            {/* Image */}
                                            <CardMedia
                                                component="img"
                                                height="140"
                                                image={image.src}
                                                alt={`${index + 1}`}
                                            />
                                            {/* Content */}
                                            <CardContent>
                                                {/* Image Name */}
                                                <Typography variant="caption" sx={{ textAlign: 'center' }}>
                                                    {image.name}
                                                </Typography>
                                                {/* Remove Button */}
                                                <Button
                                                    onClick={() => removeImage(index)}
                                                    size="small"
                                                    sx={{
                                                        position: 'absolute',
                                                        top: '-15px',
                                                        right: '-30px',
                                                        color: 'error.light',
                                                        '&:hover': {
                                                            color: 'error.dark'
                                                        }
                                                    }}
                                                >
                                                    <CancelIcon />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                            {/* Add More Images Button */}
                            <Grid item xs={12} md={2} sx={{ textAlign: 'center' }}>
                                <Card sx={{ maxWidth: 300 }}>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                    >
                                        Add More Images
                                        <input style={{ display: 'none' }} type="file" accept="image/*" multiple id="image-upload" />
                                    </Button>
                                </Card>
                            </Grid>

                        </Grid>

                        {/* Export Section */}
                        <Grid item xs={12} md={3} container spacing={2} direction="column" alignItems="stretch">

                            {/* Convert to PDF Button */}
                            <Grid item>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleGeneratePdfFromImages}
                                    size="large"
                                    fullWidth
                                    // Disable the button when no images are uploaded
                                    disabled={uploadedImages.length === 0}
                                >
                                    Convert to PDF
                                </Button>
                            </Grid>

                            {/* 'File Name' Field & 'Append Date-Time' Button */}
                            <Grid item>

                                {/* PDF Filename Text Field */}
                                <Grid item xs>
                                    <TextField
                                        label="PDF Filename"
                                        fullWidth
                                        value={pdfFilename}
                                        onChange={(e) => setPdfFilename(e.target.value.trim())}
                                    />
                                </Grid>
                                {/* Append Date-Time Switch */}
                                <Grid item>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={appendDateTime}
                                                onChange={(e) => setAppendDateTime(e.target.checked)}
                                                name="appendDateTime"
                                                color="primary"
                                            />
                                        }
                                        label="Append Date-Time"
                                        labelPlacement='start'
                                    />
                                </Grid>
                            </Grid>

                            {/* Export Settings: Page Orientation, size, margin, alignment, fit to page */}
                            <Grid item>
                                <Grid container spacing={2} direction="column" alignItems="stretch">
                                    {/* Page Size */}
                                    <Grid item>
                                        <Select
                                            label="Page Size"
                                            fullWidth
                                            value={pageSize}
                                            onChange={(e) => setPageSize(e.target.value)}
                                        >
                                            {Object.keys(pageSizes).map((size) => (
                                                <MenuItem key={size} value={size}>
                                                    {size}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Grid>

                                    <Grid item>
                                        <Select
                                            label="Page Orientation"
                                            fullWidth
                                            value={pageOrientation}
                                            onChange={(e) => setPageOrientation(e.target.value)}
                                        >
                                            <MenuItem value="Portrait">Portrait</MenuItem>
                                            <MenuItem value="Landscape">Landscape</MenuItem>
                                            <MenuItem value="Auto">Auto (as per image)</MenuItem>
                                        </Select>
                                    </Grid>

                                    <Grid item>
                                        <Select
                                            label="Margin Settings"
                                            fullWidth
                                            value={marginSetting}
                                            onChange={(e) => setMarginSetting(e.target.value)}
                                        >
                                            <MenuItem value="Default">Default</MenuItem>
                                            <MenuItem value="Minimum">Minimum</MenuItem>
                                            <MenuItem value="None">None</MenuItem>
                                        </Select>
                                    </Grid>

                                    {/* Image Alignment */}
                                    <Grid item>
                                        <Select
                                            label="Image Alignment"
                                            fullWidth
                                            value={alignment}
                                            onChange={(e) => setAlignment(e.target.value)}
                                        >
                                            {Object.keys(imageAlignments).map((alignment) => (
                                                <MenuItem key={alignment} value={alignment}>
                                                    {alignment}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Grid>

                                    {/* Fit to Page Switch */}
                                    <Grid item>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={fitToPage}
                                                    onChange={(e) => setFitToPage(e.target.checked)}
                                                    name="fitToPage"
                                                    color="primary"
                                                />
                                            }
                                            label="Fit to Page"
                                            labelPlacement='start'
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                        </Grid>
                    </Grid>
                </CustomTabPanel>
            </Box>
        </Container>
    );
}

export default MainImagesToPDFConsolidator;
