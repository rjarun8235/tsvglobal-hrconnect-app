import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowUpDown, Edit, Trash2, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    emp_id: '',
    name: '',
    designation: '',
    date_of_joining: '',
    phone_no: '',
    email: '',
    address: '',
    dob: '',
    emergency_contact_no: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingEmployee, setEditingEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order(sortField, { ascending: sortDirection === 'asc' });
      if (error) throw error;
      setEmployees(data);
    } catch (error) {
      toast.error('Error fetching employees: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!newEmployee.emp_id || !newEmployee.name || !newEmployee.email) {
        throw new Error("Employee ID, Name, and Email are required fields.");
      }

      // 1. Create employee record
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .insert([newEmployee])
        .select();

      if (employeeError) {
        console.error('Employee creation error:', employeeError);
        throw new Error(`Error creating employee: ${employeeError.message}`);
      }

      const employeeId = employeeData[0].emp_id;

      // 2. Create folder reference in storage_paths
      const folderPath = employeeId.replace(/\//g, '_');
      const { error: storagePathError } = await supabase
        .from('storage_paths')
        .insert([{ 
          emp_id: employeeId, 
          folder_path: folderPath,
          folder_type: 'employee'
        }]);

      if (storagePathError) {
        console.error('Storage path error:', storagePathError);
        throw new Error(`Error creating storage path: ${storagePathError.message}`);
      }

      // 3. Upload profile picture if provided
      if (profilePicture) {
        const fileExt = profilePicture.name.split('.').pop();
        const filePath = `${folderPath}/profile_picture.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('employees_info')
          .upload(filePath, profilePicture);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Error uploading profile picture: ${uploadError.message}`);
        }

        // 4. Get the public URL of the uploaded file
        const { data: urlData } = supabase.storage
          .from('employees_info')
          .getPublicUrl(filePath);

        // 5. Store the URL in employee_documents
        const { error: docError } = await supabase
          .from('employee_documents')
          .insert({
            emp_id: employeeId,
            file_name: 'profile_picture',
            file_path: filePath,
            file_type: fileExt,
            uploaded_by: 'system',
            file_url: urlData.publicUrl
          });

        if (docError) {
          console.error('Document error:', docError);
          throw new Error(`Error storing document information: ${docError.message}`);
        }
      }

      toast.success('Employee added successfully');
      fetchEmployees();
      setNewEmployee({
        emp_id: '',
        name: '',
        designation: '',
        date_of_joining: '',
        phone_no: '',
        email: '',
        address: '',
        dob: '',
        emergency_contact_no: ''
      });
      setProfilePicture(null);
    } catch (error) {
      toast.error('Error adding employee: ' + error.message);
    }
  };

  const handleInputChange = (e) => {
    setNewEmployee({ ...newEmployee, [e.target.name]: e.target.value });
  };

  const handleProfilePictureChange = (e) => {
    setProfilePicture(e.target.files[0]);
  };

  const handleSort = (field) => {
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  const handleUpdate = (employee) => {
    setEditingEmployee(employee);
  };

  const handleSaveUpdate = async () => {
    try {
      const { error } = await supabase
        .from('employees')
        .update(editingEmployee)
        .eq('emp_id', editingEmployee.emp_id);

      if (error) throw error;

      toast.success('Employee updated successfully');
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast.error('Error updating employee: ' + error.message);
    }
  };

  const handleDelete = async (empId) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('emp_id', empId);

      if (error) throw error;

      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      toast.error('Error deleting employee: ' + error.message);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Employee Management</h2>
      
      {/* Add Employee Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add New Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emp_id">Employee ID</Label>
                <Input
                  id="emp_id"
                  name="emp_id"
                  value={newEmployee.emp_id}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={newEmployee.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  name="designation"
                  value={newEmployee.designation}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="date_of_joining">Date of Joining</Label>
                <Input
                  id="date_of_joining"
                  name="date_of_joining"
                  type="date"
                  value={newEmployee.date_of_joining}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="phone_no">Phone Number</Label>
                <Input
                  id="phone_no"
                  name="phone_no"
                  value={newEmployee.phone_no}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={newEmployee.address}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={newEmployee.dob}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_no">Emergency Contact Number</Label>
                <Input
                  id="emergency_contact_no"
                  name="emergency_contact_no"
                  value={newEmployee.emergency_contact_no}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="profile_picture">Profile Picture</Label>
              <Input
                id="profile_picture"
                type="file"
                onChange={handleProfilePictureChange}
                accept="image/*"
              />
            </div>
            <Button type="submit">Add Employee</Button>
          </form>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort('name')}>
                  Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.emp_id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.emp_id}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleUpdate(employee)} className="mr-2">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDelete(employee.emp_id)} variant="destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      {editingEmployee && (
        <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveUpdate(); }} className="space-y-4">
              <div>
                <Label htmlFor="edit_name">Name</Label>
                <Input
                  id="edit_name"
                  name="name"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_designation">Designation</Label>
                <Input
                  id="edit_designation"
                  name="designation"
                  value={editingEmployee.designation}
                  onChange={(e) => setEditingEmployee({...editingEmployee, designation: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  name="email"
                  type="email"
                  value={editingEmployee.email}
                  onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_phone">Phone Number</Label>
                <Input
                  id="edit_phone"
                  name="phone_no"
                  value={editingEmployee.phone_no}
                  onChange={(e) => setEditingEmployee({...editingEmployee, phone_no: e.target.value})}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EmployeeManagement;