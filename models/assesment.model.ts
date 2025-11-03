import mongoose, { Schema, Document } from "mongoose";

export interface Assessment extends Document {
  title: string;
  description?: string;
  jobOpportunity?: mongoose.Types.ObjectId;
  employer: mongoose.Types.ObjectId;
  status: 'draft' | 'active' | 'completed' | 'archived';
  
  // Rounds configuration
  toConductRounds: {
    aptitude: boolean;
    coding: boolean;
    technicalInterview: boolean;
    hrInterview: boolean;
  };

  // Aptitude Round Configuration
  aptitudeId?: mongoose.Types.ObjectId;
  // Coding Round Configuration (reference)
  codingRoundId?: mongoose.Types.ObjectId;

  // Technical Interview Round Configuration (reference)
  technicalInterviewId?: mongoose.Types.ObjectId;

  // HR Interview Round Configuration (reference)
  hrInterviewId?: mongoose.Types.ObjectId;

  // Overall assessment settings
  overallPassingCriteria: {
    minimumRoundsToPass: number;
    overallMinimumScore?: number;
    weightagePerRound: {
      aptitude?: number;
      coding?: number;
      technicalInterview?: number;
      hrInterview?: number;
    };
  };

  // Assessment metadata
  totalCandidates: number;
  completedCandidates: number;
  passingCandidates: number;
  
  // Scheduling
  applicationDeadline?: Date;
  assessmentStartDate?: Date;
  assessmentEndDate?: Date;
  
  // Notifications
  sendReminders: boolean;
  reminderTimings: number[]; // hours before assessment [24, 2, 0.5]
  
  // Results
  publishResults: boolean;
  resultsPublishedAt?: Date;
  
  // Security and monitoring
  allowMultipleAttempts: boolean;
  maxAttempts?: number;
  ipRestrictions: string[]; // allowed IP ranges
  browserRestrictions: string[]; // allowed browsers
  
  // Custom instructions
  instructions?: string;
  candidateInstructions?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    
    jobOpportunity: {
      type: Schema.Types.ObjectId,
      ref: "jobopportunity"
    },
    
    employer: {
      type: Schema.Types.ObjectId,
      ref: "employer",
      required: true
    },
    
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'archived'],
      default: 'draft'
    },
    
    toConductRounds: {
      aptitude: { type: Boolean, default: false },
      coding: { type: Boolean, default: false },
      technicalInterview: { type: Boolean, default: false },
      hrInterview: { type: Boolean, default: false }
    },
    
    aptitudeId: {
      type: Schema.Types.ObjectId,
      ref: "aptitude"
    },
    codingRoundId: {
      type: Schema.Types.ObjectId,
      ref: "coding"
    },
    technicalInterviewId: {
      type: Schema.Types.ObjectId,
      ref: "technicalinterview"
    },
    hrInterviewId: {
      type: Schema.Types.ObjectId,
      ref: "hrinterview"
    },

    overallPassingCriteria: {
      minimumRoundsToPass: { type: Number, min: 1, max: 4, default: 1 },
      overallMinimumScore: { type: Number, min: 0 },
      weightagePerRound: {
        aptitude: { type: Number, min: 0, max: 100 },
        coding: { type: Number, min: 0, max: 100 },
        technicalInterview: { type: Number, min: 0, max: 100 },
        hrInterview: { type: Number, min: 0, max: 100 }
      }
    },
    
    totalCandidates: { type: Number, default: 0, min: 0 },
    completedCandidates: { type: Number, default: 0, min: 0 },
    passingCandidates: { type: Number, default: 0, min: 0 },
    
    applicationDeadline: { type: Date },
    assessmentStartDate: { type: Date },
    assessmentEndDate: { type: Date },
    
    sendReminders: { type: Boolean, default: true },
    reminderTimings: [{ type: Number }], // hours before assessment
    
    publishResults: { type: Boolean, default: false },
    resultsPublishedAt: { type: Date },
    
    allowMultipleAttempts: { type: Boolean, default: false },
    maxAttempts: { type: Number, min: 1, max: 5 },
    ipRestrictions: [{ type: String }],
    browserRestrictions: [{ type: String }],
    
    instructions: { type: String, trim: true, maxlength: 2000 },
    candidateInstructions: { type: String, trim: true, maxlength: 2000 }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
AssessmentSchema.index({ employer: 1, createdAt: -1 });
AssessmentSchema.index({ jobOpportunity: 1 });
AssessmentSchema.index({ status: 1 });
AssessmentSchema.index({ "aptitude.scheduledDate": 1 });
AssessmentSchema.index({ "coding.scheduledDate": 1 });

// Virtual for total weightage validation
AssessmentSchema.virtual('aptitudeWeightageTotal').get(function() {
  // Aptitude is now referenced by aptitudeId; sectionWeightage logic should be handled in Aptitude model/service
  return 0;
});

// Validation middleware
AssessmentSchema.pre('save', function(next) {
  const doc = this as unknown as Assessment;
  
  // Aptitude round config and sectionWeightage validation should be handled in Aptitude model/service
  
  // Validate overall round weightage if specified
  if (doc.overallPassingCriteria?.weightagePerRound) {
    const weights = doc.overallPassingCriteria.weightagePerRound;
    
    // Since only aptitude is implemented for now, validate accordingly
    if (doc.toConductRounds?.aptitude && weights.aptitude && weights.aptitude !== 100) {
      return next(new Error('Aptitude round weightage must be 100% when it\'s the only enabled round'));
    }
    
    // Once other rounds are implemented, add validation for them here
  }
  
  next();
});

const AssessmentModel = (mongoose.models.assessment as mongoose.Model<Assessment>) || 
                       mongoose.model<Assessment>('assessment', AssessmentSchema);

export default AssessmentModel;

