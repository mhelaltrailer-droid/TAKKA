import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/location/obour_areas.dart';
import '../../../core/location/obour_location_picker.dart';
import '../../../core/network/mobile_upload_service.dart';
import '../../../core/theme/app_theme.dart';
import '../data/kitchen_management_service.dart';

class KitchenOnboardingScreen extends StatefulWidget {
  const KitchenOnboardingScreen({super.key});

  @override
  State<KitchenOnboardingScreen> createState() => _KitchenOnboardingScreenState();
}

class _KitchenOnboardingScreenState extends State<KitchenOnboardingScreen> {
  final _service = const KitchenManagementService();
  final _uploadService = MobileUploadService();
  final _formKey = GlobalKey<FormState>();
  final _kitchenNameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _logoController = TextEditingController();
  final _coverController = TextEditingController();
  final _instapayHandleController = TextEditingController();
  final _instapayLinkController = TextEditingController();
  final _nationalIdController = TextEditingController();

  ObourLocationSelection _location = const ObourLocationSelection(
    cityName: obourCityName,
    regionName: '',
  );
  bool _isSaving = false;
  bool _locationReady = false;

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  @override
  void dispose() {
    _kitchenNameController.dispose();
    _descriptionController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _logoController.dispose();
    _coverController.dispose();
    _instapayHandleController.dispose();
    _instapayLinkController.dispose();
    _nationalIdController.dispose();
    super.dispose();
  }

  Future<void> _loadExisting() async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final profile = await _service.loadProfile(sessionToken: token.jwt);

      if (profile == null || !mounted) {
        setState(() => _locationReady = true);
        return;
      }

      _kitchenNameController.text = profile.kitchenName;
      _descriptionController.text = profile.description ?? '';
      _phoneController.text = profile.phoneNumber;
      _addressController.text = profile.addressLine;
      _logoController.text = profile.logoUrl ?? '';
      _coverController.text = profile.coverImageUrl ?? '';
      _instapayHandleController.text = profile.instapayHandle ?? '';
      _instapayLinkController.text = profile.instapayLink ?? '';
      setState(() {
        _location = ObourLocationSelection(
          cityName: obourCityName,
          regionName: profile.regionName,
        );
        _locationReady = true;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _locationReady = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('إعداد المطبخ'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _field(_kitchenNameController, 'اسم المطبخ'),
            _field(_descriptionController, 'الوصف', maxLines: 3),
            _field(_phoneController, 'رقم الهاتف'),
            if (_locationReady)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'موقع المطبخ (يظهر للعملاء في نفس الحي)',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'اختر الحي الذي يعمل فيه المطبخ. العملاء الذين يختارون نفس الحي سيرون مطبخك ضمن «مطابخ قريبة منك».',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: TakkaColors.muted,
                            height: 1.5,
                          ),
                    ),
                    const SizedBox(height: 12),
                    ObourLocationPicker(
                      initialRegionName: _location.regionName,
                      initialLatitude: _location.latitude,
                      initialLongitude: _location.longitude,
                      onChanged: (selection) {
                        setState(() => _location = selection);
                      },
                    ),
                  ],
                ),
              ),
            _field(_addressController, 'العنوان', maxLines: 2),
            _imageField(
              _logoController,
              'رابط اللوجو',
              'kitchenLogo',
            ),
            _imageField(
              _coverController,
              'رابط صورة الغلاف',
              'kitchenCover',
            ),
            _field(_instapayHandleController, 'معرّف InstaPay'),
            _field(_instapayLinkController, 'رابط الدفع'),
            _imageField(
              _nationalIdController,
              'رابط صورة البطاقة',
              'kitchenDocument',
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _isSaving ? null : _save,
              icon: _isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: Text(
                _isSaving ? 'جارٍ الحفظ...' : 'حفظ وإرسال للاعتماد',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        maxLines: maxLines,
        validator: (value) {
          if ((label == 'اسم المطبخ' ||
                  label == 'رقم الهاتف' ||
                  label == 'العنوان') &&
              (value == null || value.trim().isEmpty)) {
            return 'هذا الحقل مطلوب';
          }
          return null;
        },
        decoration: InputDecoration(labelText: label),
      ),
    );
  }

  Widget _imageField(
    TextEditingController controller,
    String label,
    String purpose,
  ) {
    return Column(
      children: [
        _field(controller, label),
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Align(
            alignment: Alignment.centerRight,
            child: OutlinedButton.icon(
              onPressed: () => _uploadImage(controller, purpose),
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text('اختيار ورفع صورة'),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final locationError = assertObourLocation(
      _location.cityName,
      _location.regionName,
    );
    if (locationError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(locationError)),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _service.saveProfile(
        sessionToken: token.jwt,
        payload: {
          'kitchenName': _kitchenNameController.text.trim(),
          'description': _descriptionController.text.trim(),
          'phoneNumber': _phoneController.text.trim(),
          'cityName': obourCityName,
          'regionName': _location.regionName,
          'addressLine': _addressController.text.trim(),
          'latitude': _location.latitude,
          'longitude': _location.longitude,
          'logoUrl': _logoController.text.trim(),
          'coverImageUrl': _coverController.text.trim(),
          'instapayHandle': _instapayHandleController.text.trim(),
          'instapayLink': _instapayLinkController.text.trim(),
          'nationalIdImageUrl': _nationalIdController.text.trim(),
        },
      );

      if (!mounted) {
        return;
      }

      await _showSubmittedAndGoHome();
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _showSubmittedAndGoHome() async {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return const AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(24)),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(height: 8),
              Icon(
                Icons.check_circle_outline_rounded,
                color: Color(0xFF059669),
                size: 48,
              ),
              SizedBox(height: 16),
              Text(
                'تم إرسال بيانات المطبخ',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                ),
              ),
              SizedBox(height: 12),
              Text(
                'سوف يتم مراجعة بياناتك من التطبيق',
                textAlign: TextAlign.center,
                style: TextStyle(height: 1.6),
              ),
              SizedBox(height: 10),
              Text(
                'جاري تحويلك إلى لوحة التحكم',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: TakkaColors.secondary,
                ),
              ),
              SizedBox(height: 18),
              SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
            ],
          ),
        );
      },
    );

    await Future<void>.delayed(const Duration(milliseconds: 2800));

    if (!mounted) {
      return;
    }

    Navigator.of(context).pop(); // close dialog
    Navigator.of(context).pop(); // back to kitchen dashboard
  }

  Future<void> _uploadImage(
    TextEditingController controller,
    String purpose,
  ) async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final url = await _uploadService.pickAndUploadImage(
        sessionToken: token.jwt,
        purpose: purpose,
      );

      if (url != null && mounted) {
        controller.text = url;
        setState(() {});
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }
}
