import mongoose , {Document , Schema} from "mongoose"

export interface Candidate extends Document{
    id : string,
    email : string,
    password : string
    firstName : string
    lastName : string
    bio : string
    avatar : string
    isVerified : boolean,
    otp : number
}
const candidateSchema : Schema<Candidate>  = new Schema({
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        trim: true 
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'] 
    },
    firstName: { 
        type: String, 
        required: [true, 'First name is required'] 
    },
    lastName: { 
        type: String, 
        required: [true, 'Last name is required'] 
    },
    bio: { 
        type: String, 
        default: '' 
    },
    avatar: { 
        type: String, 
        default: '' 
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    otp: { 
        type: Number,
        required: true 
    }
});

const candidate = (mongoose.models.Candidate as mongoose.Model<Candidate>) || mongoose.model<Candidate>('candidate', candidateSchema);

export default candidate; 