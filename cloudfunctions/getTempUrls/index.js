const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d0g1q4d5p6fc28083' })

// 批量将 cloud:// fileID 转换为临时 HTTPS URL（管理员权限，绕过存储权限限制）
exports.main = async function(event) {
  var fileList = (event && event.fileList) || []
  fileList = fileList.filter(function(id) { return id && id.indexOf('cloud://') === 0 })
  if (fileList.length === 0) return { fileList: [] }
  try {
    var res = await cloud.getTempFileURL({ fileList: fileList })
    return { fileList: res.fileList || [] }
  } catch(e) {
    return { fileList: [], error: e.message }
  }
}
