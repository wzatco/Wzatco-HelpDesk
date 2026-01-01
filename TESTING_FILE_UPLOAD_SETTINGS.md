# Testing File Upload Settings

## 1. Access the Settings Page

1. Start your development server (if not already running):
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/admin/settings`
   - Or click on **Settings** → **General Settings** in the sidebar

3. Scroll down to the **File Upload Settings** section

## 2. Test Max Upload Size

### Test Steps:
1. **View Default Value**: Check that the default is `10` MB
2. **Change Value**: 
   - Enter a new value (e.g., `25`)
   - Click **Save Changes**
   - You should see a success notification
3. **Refresh Page**: 
   - Reload the page
   - Verify the value persists (should show `25`)
4. **Test Validation**:
   - Try entering values outside 1-1000 range
   - The input should restrict invalid values

### Expected Results:
- ✅ Value saves successfully
- ✅ Value persists after page refresh
- ✅ Success notification appears
- ✅ Input validates min/max range

## 3. Test Allowed File Types

### Test Steps:
1. **View Default Types**: 
   - You should see default MIME types like:
     - `image/jpeg`
     - `image/png`
     - `application/pdf`
     - etc.

2. **Add New File Type**:
   - Type a MIME type in the input (e.g., `application/json`)
   - Press **Enter** or click **Add**
   - The type should appear as a tag below

3. **Remove File Type**:
   - Click the **X** button on any tag
   - The type should be removed

4. **Save and Verify**:
   - Click **Save Changes**
   - Refresh the page
   - Verify your added/removed types persist

### Expected Results:
- ✅ Can add new MIME types
- ✅ Can remove existing types
- ✅ Duplicate types are prevented
- ✅ Changes persist after save and refresh

## 4. Test Client Phone Upload Toggle

### Test Steps:
1. **Check Default State**: Should be **enabled** (toggle on)
2. **Toggle Off**: 
   - Click the toggle to disable
   - Click **Save Changes**
3. **Refresh Page**: 
   - Verify toggle state persists (should be off)
4. **Toggle On**: 
   - Enable it again
   - Save and verify

### Expected Results:
- ✅ Toggle changes state visually
- ✅ State persists after save
- ✅ State persists after page refresh

## 5. Test Ticket File Upload Toggle

### Test Steps:
1. **Check Default State**: Should be **enabled** (toggle on)
2. **Toggle Off**: 
   - Click the toggle to disable
   - Click **Save Changes**
3. **Refresh Page**: 
   - Verify toggle state persists (should be off)
4. **Toggle On**: 
   - Enable it again
   - Save and verify

### Expected Results:
- ✅ Toggle changes state visually
- ✅ State persists after save
- ✅ State persists after page refresh

## 6. Test API Endpoints Directly

### Test GET Endpoint:
```bash
# Using curl (or Postman/Thunder Client)
curl http://localhost:3000/api/admin/settings/file-upload
```

**Expected Response:**
```json
{
  "success": true,
  "settings": {
    "maxUploadSize": "10",
    "allowedFileTypes": ["image/jpeg", "image/png", ...],
    "clientPhoneUpload": true,
    "ticketFileUpload": true
  }
}
```

### Test PATCH Endpoint:
```bash
curl -X PATCH http://localhost:3000/api/admin/settings/file-upload \
  -H "Content-Type: application/json" \
  -d '{
    "maxUploadSize": "50",
    "allowedFileTypes": ["image/jpeg", "application/pdf"],
    "clientPhoneUpload": false,
    "ticketFileUpload": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "File upload settings saved successfully"
}
```

## 7. Verify Database Storage

### Using Prisma Studio:
```bash
npx prisma studio
```

1. Navigate to the **Settings** table
2. Filter by `category = 'file_upload'`
3. You should see 4 records:
   - `file_upload_max_size`
   - `file_upload_allowed_types` (JSON array)
   - `file_upload_client_phone`
   - `file_upload_ticket`

### Check Values:
- Verify `maxUploadSize` value matches what you set
- Verify `allowedFileTypes` contains your JSON array
- Verify boolean values are stored as `"true"` or `"false"` strings

## 8. Test Error Handling

### Test Invalid Requests:
1. **Missing Required Fields**: Try saving with empty max upload size
2. **Invalid File Types**: Try adding invalid MIME types
3. **Network Error**: Disconnect internet and try saving

### Expected Results:
- ✅ Appropriate error messages displayed
- ✅ Settings not corrupted by invalid data
- ✅ Previous valid settings remain intact

## 9. Test UI/UX

### Visual Checks:
- ✅ Dark mode compatibility
- ✅ Responsive design (mobile/tablet)
- ✅ File type tags are styled correctly
- ✅ Toggles match theme colors
- ✅ Success/error notifications appear correctly

## 10. Integration Testing (Future)

**Note**: Currently, the file upload settings are saved but not yet integrated into the actual upload validation code. To fully test:

1. The settings need to be fetched in:
   - `pages/admin/tickets/new.js` (line 183 - currently hardcoded 10MB)
   - `pages/admin/tickets/[id].js` (line 592 - currently hardcoded 10MB)
   - Any other file upload endpoints

2. Once integrated, test:
   - Upload files larger than max size → should be rejected
   - Upload files with disallowed types → should be rejected
   - Toggle off "Ticket File Upload" → upload button should be hidden/disabled

## Quick Test Checklist

- [ ] Settings page loads without errors
- [ ] Max Upload Size field accepts and saves values
- [ ] Allowed File Types can be added/removed
- [ ] Client Phone Upload toggle works
- [ ] Ticket File Upload toggle works
- [ ] All changes persist after page refresh
- [ ] Success notification appears on save
- [ ] API endpoints return correct data
- [ ] Database stores values correctly
- [ ] Dark mode displays correctly

## Troubleshooting

### Settings Not Saving:
- Check browser console for errors
- Check network tab for API response
- Verify you're logged in as admin
- Check database connection

### Settings Not Persisting:
- Clear browser cache
- Check database directly
- Verify API endpoint is working
- Check for JavaScript errors

### UI Issues:
- Check browser console for errors
- Verify Tailwind CSS is loading
- Check for conflicting styles
- Test in different browsers

