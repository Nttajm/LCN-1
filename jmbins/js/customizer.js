let selectedElement = null;
        let isDragging = false;
        let isResizing = false;
        let isRotating = false;
        let dragOffset = { x: 0, y: 0 };
        let elementCounter = 0;
        let rotationCenter = { x: 0, y: 0 };
        let initialAngle = 0;
        let currentRotation = 0;

        // Store all design elements data
        let designElements = {};

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            setupEventListeners();
        });

        function setupEventListeners() {
            // Font selection
            document.querySelectorAll('.font-option').forEach(option => {
                option.addEventListener('click', function() {
                    document.querySelectorAll('.font-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    if (selectedElement && selectedElement.classList.contains('text-element')) {
                        selectedElement.style.fontFamily = this.dataset.font;
                        updateElementData(selectedElement);
                    }
                });
            });

            // Property controls
            document.getElementById('textContent').addEventListener('input', updateTextContent);
            document.getElementById('fontSize').addEventListener('input', updateFontSize);
            document.getElementById('textColor').addEventListener('input', updateTextColor);
            document.getElementById('textRotation').addEventListener('input', updateTextRotation);
            document.getElementById('imageScale').addEventListener('input', updateImageScale);
            document.getElementById('imageRotation').addEventListener('input', updateImageRotation);

            document.getElementById('textBackground').addEventListener('input', updateTextBackground);
            document.getElementById('toggleCutout').addEventListener('click', toggleCutout);


            // File upload
            document.querySelector('.file-upload').addEventListener('click', function() {
                document.getElementById('imageUpload').click();
            });
        }

        function toggleTools() {
            const panel = document.querySelector('.tools-panel');
            const inspire = document.getElementById('inspire');
            panel.classList.toggle('open');
            inspire.classList.toggle('dn');
        }

        function toggleCutout() {
            if (selectedElement && selectedElement.classList.contains('text-element')) {
                const data = designElements[selectedElement.id];
                if (!data) return; // avoid undefined error

                if (data.cutout) {
                    selectedElement.style.backgroundColor = data.backgroundColor || '#ffffff';
                    data.cutout = false;
                    this.textContent = "Make Cutout $";
                } else {
                    selectedElement.style.backgroundColor = "transparent";
                    data.cutout = true;
                    this.textContent = "Revert";
                }
            }
        }


        function addTextElement() {
            elementCounter++;
            const textEl = document.createElement('div');
            textEl.className = 'design-element text-element';
            textEl.textContent = 'New Text';
            textEl.style.left = '50px';
            textEl.style.top = '50px';
            textEl.style.fontSize = '24px';
            textEl.style.color = '#000000';
            textEl.style.backgroundColor = 'White';
            textEl.style.fontFamily = 'Inter';
            textEl.id = 'element-' + elementCounter;
            
            addElementEventListeners(textEl);
            document.getElementById('designArea').appendChild(textEl);
            selectElement(textEl);
            
            // Store element data
            designElements[textEl.id] = {
                type: 'text',
                text: 'New Text',
                fontSize: 24,
                color: '#000000',
                fontFamily: 'Inter',
                backgroundColor: 'White',
                cutout: false,
                x: 50,
                y: 50,
                rotation: 0
            };
        }

        function handleImageUpload(event) {
            showNotification('Tip: Use images with transparent backgrounds, simple icons, or PNGs for best results. Avoid complex photos.');
            
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                elementCounter++;
                const imgEl = document.createElement('img');
                imgEl.className = 'design-element image-element';
                imgEl.src = e.target.result;
                imgEl.style.left = '50px';
                imgEl.style.top = '50px';
                imgEl.style.width = '100px';
                imgEl.style.height = 'auto';
                imgEl.id = 'element-' + elementCounter;
                
                addElementEventListeners(imgEl);
                document.getElementById('designArea').appendChild(imgEl);
                selectElement(imgEl);
                
                // Store element data
                designElements[imgEl.id] = {
                    type: 'image',
                    src: e.target.result,
                    width: 100,
                    cutout: false,
                    x: 50,
                    y: 50,
                    scale: 1,
                    rotation: 0
                };
            };
            reader.readAsDataURL(file);
        }

        function addElementEventListeners(element) {
            element.addEventListener('mousedown', handleMouseDown);
            element.addEventListener('touchstart', handleTouchStart, { passive: false });
            
            // Add control handles
            addControlHandles(element);
        }

        function addControlHandles(element) {
            // Delete handle
            const deleteHandle = document.createElement('div');
            deleteHandle.className = 'delete-handle';
            deleteHandle.innerHTML = '×';
            deleteHandle.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteElement(element);
            });
            element.appendChild(deleteHandle);

            // Rotate handle
            const rotateHandle = document.createElement('div');
            rotateHandle.className = 'rotate-handle';
            rotateHandle.addEventListener('mousedown', function(e) {
                e.stopPropagation();
                startRotation(e, element);
            });
            element.appendChild(rotateHandle);
            
            // Add resize handle for images
            if (element.classList.contains('image-element')) {
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle';
                resizeHandle.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                    isResizing = true;
                    selectElement(element);
                });
                element.appendChild(resizeHandle);
            }
        }

        function startRotation(e, element) {
            isRotating = true;
            selectElement(element);
            
            const rect = element.getBoundingClientRect();
            rotationCenter.x = rect.left + rect.width / 2;
            rotationCenter.y = rect.top + rect.height / 2;
            
            const angle = Math.atan2(e.clientY - rotationCenter.y, e.clientX - rotationCenter.x);
            initialAngle = angle;
            
            const transform = element.style.transform;
            const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
            currentRotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;
            
            document.addEventListener('mousemove', handleRotationMove);
            document.addEventListener('mouseup', handleRotationEnd);
        }

        function handleRotationMove(e) {
            if (!isRotating) return;
            
            const angle = Math.atan2(e.clientY - rotationCenter.y, e.clientX - rotationCenter.x);
            const deltaAngle = (angle - initialAngle) * (180 / Math.PI);
            const newRotation = currentRotation + deltaAngle;
            
            applyRotation(selectedElement, newRotation);
        }

        function handleRotationEnd() {
            isRotating = false;
            document.removeEventListener('mousemove', handleRotationMove);
            document.removeEventListener('mouseup', handleRotationEnd);
        }

        function applyRotation(element, rotation) {
            const normalizedRotation = rotation % 360;
            const otherTransforms = element.style.transform.replace(/rotate\([^)]*\)/g, '');
            element.style.transform = `${otherTransforms} rotate(${normalizedRotation}deg)`.trim();
            updateElementData(element);
        }

        function deleteElement(element) {
            if (confirm('Delete this element?')) {
                delete designElements[element.id];
                element.remove();
                if (selectedElement === element) {
                    selectedElement = null;
                    document.getElementById('elementProperties').classList.remove('active');
                }
            }
        }

        function deleteSelectedElement() {
            if (selectedElement) {
                deleteElement(selectedElement);
            }
        }

        function handleMouseDown(e) {
            if (isResizing || isRotating) return;
            
            e.preventDefault();
            isDragging = true;
            selectElement(e.currentTarget);
            
            const rect = e.currentTarget.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        function handleTouchStart(e) {
            if (isResizing || isRotating) return;
            
            e.preventDefault();
            isDragging = true;
            selectElement(e.currentTarget);
            
            const touch = e.touches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            dragOffset.x = touch.clientX - rect.left;
            dragOffset.y = touch.clientY - rect.top;
            
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
        }

        function handleMouseMove(e) {
            if (!isDragging && !isResizing) return;
            
            const designArea = document.getElementById('designArea');
            const areaRect = designArea.getBoundingClientRect();
            
            if (isDragging && selectedElement) {
                const x = e.clientX - areaRect.left - dragOffset.x;
                const y = e.clientY - areaRect.top - dragOffset.y;
                
                selectedElement.style.left = Math.max(0, x) + 'px';
                selectedElement.style.top = Math.max(0, y) + 'px';
                updateElementData(selectedElement);
            }
            
            if (isResizing && selectedElement) {
                const width = e.clientX - areaRect.left - parseInt(selectedElement.style.left);
                const height = e.clientY - areaRect.top - parseInt(selectedElement.style.top);
                
                selectedElement.style.width = Math.max(20, width) + 'px';
                selectedElement.style.height = Math.max(20, height) + 'px';
                updateElementData(selectedElement);
            }
        }

        function handleTouchMove(e) {
            if (!isDragging && !isResizing) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            const designArea = document.getElementById('designArea');
            const areaRect = designArea.getBoundingClientRect();
            
            if (isDragging && selectedElement) {
                const x = touch.clientX - areaRect.left - dragOffset.x;
                const y = touch.clientY - areaRect.top - dragOffset.y;
                
                selectedElement.style.left = Math.max(0, x) + 'px';
                selectedElement.style.top = Math.max(0, y) + 'px';
                updateElementData(selectedElement);
            }
        }

        function handleMouseUp() {
            isDragging = false;
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        function handleTouchEnd() {
            isDragging = false;
            isResizing = false;
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        }

        function selectElement(element) {
            // Remove selection from all elements
            document.querySelectorAll('.design-element').forEach(el => {
                el.classList.remove('selected');
            });
            
            selectedElement = element;
            element.classList.add('selected');
            
            // Show properties panel
            showElementProperties(element);
        }

        function showElementProperties(element) {
    const properties = document.getElementById('elementProperties');
    const textProps = document.getElementById('textProperties');
    const imageProps = document.getElementById('imageProperties');
    
    properties.classList.add('active');

    const data = designElements[element.id];
    if (!data) {
        console.warn("Element data missing for", element.id);
        return; // prevent crashes
    }

    if (element.classList.contains('text-element')) {
        textProps.style.display = 'block';
        imageProps.style.display = 'none';

        document.getElementById('textContent').value = element.textContent;
        document.getElementById('fontSize').value = parseInt(element.style.fontSize) || 24;
        document.getElementById('fontSizeValue').textContent = (parseInt(element.style.fontSize) || 24) + 'px';
        document.getElementById('textColor').value = rgbToHex(element.style.color) || '#000000';

        const rotation = getRotationFromTransform(element.style.transform);
        document.getElementById('textRotation').value = rotation;
        document.getElementById('textRotationValue').textContent = rotation + '°';

        document.getElementById('textBackground').value = rgbToHex(element.style.backgroundColor) || '#ffffff';

        const cutoutBtn = document.getElementById('toggleCutout');
        cutoutBtn.textContent = data.cutout ? "Revert" : "Make Cutout $";
    } else if (element.classList.contains('image-element')) {
        textProps.style.display = 'none';
        imageProps.style.display = 'block';

        const scale = getScaleFromTransform(element.style.transform);
        document.getElementById('imageScale').value = scale;
        document.getElementById('imageScaleValue').textContent = Math.round(scale * 100) + '%';

        const rotation = getRotationFromTransform(element.style.transform);
        document.getElementById('imageRotation').value = rotation;
        document.getElementById('imageRotationValue').textContent = rotation + '°';
    }
}


        function getRotationFromTransform(transform) {
            const match = transform.match(/rotate\(([^)]+)\)/);
            return match ? parseFloat(match[1]) : 0;
        }

        function getScaleFromTransform(transform) {
            const match = transform.match(/scale\(([^)]+)\)/);
            return match ? parseFloat(match[1]) : 1;
        }

        function updateTextBackground() {
            if (selectedElement && selectedElement.classList.contains('text-element')) {
                selectedElement.style.backgroundColor = this.value;
                designElements[selectedElement.id].backgroundColor = this.value;
                designElements[selectedElement.id].cutout = false; // if you change bg, it's no longer cutout
            }
        }


        function updateElementData(element) {
            if (!designElements[element.id]) return;
            
            const data = designElements[element.id];
            data.x = parseInt(element.style.left) || 0;
            data.y = parseInt(element.style.top) || 0;
            data.rotation = getRotationFromTransform(element.style.transform);
            
            if (element.classList.contains('text-element')) {
                data.text = element.textContent;
                data.fontSize = parseInt(element.style.fontSize) || 24;
                data.color = element.style.color || '#000000';
                data.fontFamily = element.style.fontFamily || 'Inter';
                data.backgroundColor = element.style.backgroundColor || 'transparent';
                data.cutout = (element.style.backgroundColor === "transparent");
            } else if (element.classList.contains('image-element')) {
                data.width = parseInt(element.style.width) || 100;
                data.scale = getScaleFromTransform(element.style.transform);
            }
        }

        function updateTextContent() {
            if (selectedElement && selectedElement.classList.contains('text-element')) {
                selectedElement.textContent = this.value;
                updateElementData(selectedElement);
            }
        }

        function updateFontSize() {
            if (selectedElement && selectedElement.classList.contains('text-element')) {
                selectedElement.style.fontSize = this.value + 'px';
                document.getElementById('fontSizeValue').textContent = this.value + 'px';
                updateElementData(selectedElement);
            }
        }

        function updateTextColor() {
            if (selectedElement && selectedElement.classList.contains('text-element')) {
                selectedElement.style.color = this.value;
                updateElementData(selectedElement);
            }
        }

        function updateTextRotation() {
            if (selectedElement && selectedElement.classList.contains('text-element')) {
                applyRotation(selectedElement, this.value);
                document.getElementById('textRotationValue').textContent = this.value + '°';
            }
        }

        function updateImageScale() {
            if (selectedElement && selectedElement.classList.contains('image-element')) {
                const rotation = getRotationFromTransform(selectedElement.style.transform);
                selectedElement.style.transform = `scale(${this.value}) rotate(${rotation}deg)`;
                document.getElementById('imageScaleValue').textContent = Math.round(this.value * 100) + '%';
                updateElementData(selectedElement);
            }
        }

        function updateImageRotation() {
            if (selectedElement && selectedElement.classList.contains('image-element')) {
                applyRotation(selectedElement, this.value);
                document.getElementById('imageRotationValue').textContent = this.value + '°';
            }
        }

        function clearDesign() {
            if (confirm('Are you sure you want to clear all elements?')) {
                document.getElementById('designArea').innerHTML = '';
                selectedElement = null;
                designElements = {};
                document.getElementById('elementProperties').classList.remove('active');
            }
        }

        function showDesignData() {
            console.log('Design Elements:', designElements);
            alert('Design data logged to console. Open developer tools to view.');
        }

        function exportDesign() {
            const designArea = document.getElementById('designArea');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set high resolution
            const scale = 6;
            canvas.width = designArea.offsetWidth * scale;
            canvas.height = designArea.offsetHeight * scale;
            ctx.scale(scale, scale);
            
            // Fill background
            ctx.fillStyle = 'transparent';
            ctx.fillRect(0, 0, designArea.offsetWidth, designArea.offsetHeight);
            
            const elements = designArea.querySelectorAll('.design-element');
            let loadedImages = 0;
            let totalImages = 0;
            
            // Count images
            elements.forEach(el => {
                if (el.classList.contains('image-element')) {
                    totalImages++;
                }
            });
            
            function checkComplete() {
                if (loadedImages === totalImages) {
                    renderElements();
                }
            }
            
            function renderElements() {
                elements.forEach(element => {
                    const left = parseInt(element.style.left) || 0;
                    const top = parseInt(element.style.top) || 0;
                    const rotation = getRotationFromTransform(element.style.transform);
                    
                    ctx.save();
                    
                    if (element.classList.contains('text-element')) {
                        const fontSize = parseInt(element.style.fontSize) || 24;
                        const fontFamily = element.style.fontFamily || 'Inter';
                        const color = element.style.color || '#000000';
                        
                        ctx.font = `${fontSize}px ${fontFamily}`;
                        ctx.fillStyle = color;
                        ctx.textBaseline = 'top';
                        
                        // Apply rotation
                        if (rotation !== 0) {
                            const textWidth = ctx.measureText(element.textContent).width;
                            const centerX = left + textWidth / 2;
                            const centerY = top + fontSize / 2;
                            ctx.translate(centerX, centerY);
                            ctx.rotate(rotation * Math.PI / 180);
                            ctx.translate(-textWidth / 2, -fontSize / 2);
                            ctx.fillText(element.textContent, 0, 0);
                        } else {
                            ctx.fillText(element.textContent, left, top);
                        }
                    } else if (element.classList.contains('image-element')) {
                        const img = element;
                        const scale = getScaleFromTransform(element.style.transform);
                        const width = img.offsetWidth * scale;
                        const height = img.offsetHeight * scale;
                        
                        // Apply rotation
                        if (rotation !== 0) {
                            const centerX = left + width / 2;
                            const centerY = top + height / 2;
                            ctx.translate(centerX, centerY);
                            ctx.rotate(rotation * Math.PI / 180);
                            ctx.translate(-width / 2, -height / 2);
                            ctx.drawImage(img, 0, 0, width, height);
                        } else {
                            ctx.drawImage(img, left, top, width, height);
                        }
                    }
                    
                    ctx.restore();
                });
                
                // Download
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'shirt-design.png';
                    a.click();
                    URL.revokeObjectURL(url);
                });
            }
            
            if (totalImages === 0) {
                renderElements();
            } else {
                elements.forEach(element => {
                    if (element.classList.contains('image-element')) {
                        element.onload = function() {
                            loadedImages++;
                            checkComplete();
                        };
                        if (element.complete) {
                            loadedImages++;
                            checkComplete();
                        }
                    }
                });
            }
        }

        function showNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 10000);
        }

        function rgbToHex(rgb) {
            if (!rgb) return null;
            
            const result = rgb.match(/\d+/g);
            if (!result) return null;
            
            const r = parseInt(result[0]);
            const g = parseInt(result[1]);
            const b = parseInt(result[2]);
            
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }

        // Click outside to deselect
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.design-element') && !e.target.closest('.tools-panel')) {
                if (selectedElement) {
                    selectedElement.classList.remove('selected');
                    selectedElement = null;
                    document.getElementById('elementProperties').classList.remove('active');
                }
            }
        });