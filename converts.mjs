/* global fetch */

import { validateAndFormatPhone } from "./phone.mjs";

//initiate parameters
const whatToken = process.env.what_converts_token;
const whatSecret = process.env.what_converts_secret;
const baseUrl = process.env.what_converts_api_link;

//encode the token and secret for Basic Auth
const basicAuth = 'Basic ' + Buffer.from(`${whatToken}:${whatSecret}`).toString('base64');

export async function getLead(email, phone) {
    
    //get today's date
    const today = new Date();
    
    //subtract 400 days from today
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 399);
    
    // Convert to ISO 8601 format (UTC) without milliseconds
    const startDate = pastDate.toISOString().split('.')[0] + 'Z';
    
    //try with phone number first
    if (phone) {

        //validate and format phone number to e164
        const phoneFormatted = await validateAndFormatPhone(phone)

        //if phone number valid proceed with lead lookup using phone number
        if (phoneFormatted) {
            let url = new URL(baseUrl);
            //assemble parameters
            let params = {
                "lead_status": "unique",
                "start_date": startDate,
                "phone_number": phoneFormatted,
                "profile_id": process.env.PROFILE_ID
            };
            //append the query parameters
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            const phoneTry = await apiCall(url, 'GET');
            //if leads array is not empty return the lead
            if (phoneTry.leads && phoneTry.leads.length) {
                return phoneTry.leads[0];
            }
            //if leads array is empty the script will proceed to email try
        }
        //if phone number is invalid the script will proceed to email try

    }
    
    //try with email
    if (email) {
        let url = new URL(baseUrl);
        
        //assemble parameters
        let params = {
            "lead_status": "unique",
            "start_date": startDate,
            "email_address": email,
            "profile_id": process.env.PROFILE_ID
        };
        
        //append the query parameters
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        const emailTry = await apiCall(url, 'GET');
        
        //if leads array is not empty return the lead
        if (emailTry.leads && emailTry.leads.length) {
            return emailTry.leads[0];
        } else {
            //no lead with such phone and/or email available
            const status = false;
            return status;
        }
    } else {
        //no lead with such phone number and/or no email provided
        const status = false;
        return status;
    }
    
}

export async function updateLead(id, amount) {
    
    let url = new URL(baseUrl);
    
    //update the pathname by appending the leadId
    url.pathname += `/${id}`;
    
    //create form data object to hold parameters
    let formData = new FormData();
    formData.append('sales_value', amount);
    
    //send new data to whatconverts
    const newData = await apiCall(url, 'POST', formData);
    
    return newData;
}

export async function updateQuoteValue(leadId, value) {

    let url = new URL(baseUrl);

    //update the pathname by appending the leadId
    url.pathname += `/${leadId}`;

    //create form data object to hold parameters
    let formData = new FormData();
    formData.append('quote_value', value);
    console.log(formData.get('quote_value'))
    //send new data to whatconverts
    const newData = await apiCall(url, 'POST', formData);
    console.log('lead updated: ', newData)

    return newData;
}

async function apiCall(url, method, formData) {
    try {
        
        //define the options for the fetch call
        const options = {
            method: method,
            headers: {
                'Authorization': basicAuth
            }
        };
        
        //attach form data to the body only for POST requests
        if (method === 'POST' && formData) {
            options.body = formData;
        }
        
        const res = await fetch(url, options);
    
        //parse and return the response as JSON
        const data = await res.json();
        return data;
    }
    
    catch (e) {
        console.error(e);
        return 500;
    }
}