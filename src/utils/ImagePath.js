const API_FILE_ROOT = process.env.REACT_APP_API_URL

const ImagePathService = (filename) => {
    if (filename?.startsWith('http')) {
        return filename
    } else {
        return `${API_FILE_ROOT}/service/${filename}`
    }
}

const ImagePathCustomer = (filename) => {
    if (filename?.startsWith('http')) {
        return filename
    } else {
        return `${API_FILE_ROOT}/${filename}`
    }
}

export {
    ImagePathService,
    ImagePathCustomer
}