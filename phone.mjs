import { parsePhoneNumberFromString } from 'libphonenumber-js'

export async function validateAndFormatPhone(phone) {
    const phoneNumber = parsePhoneNumberFromString(phone, 'US')

    //if valid - format it to e164, if not return false
    if (phoneNumber) {
        return phoneNumber.format('E.164')
    } else {
        return false
    }
}